"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dgram = __importStar(require("dgram"));
const dns_packet_1 = __importDefault(require("dns-packet"));
const ip6addr_1 = __importDefault(require("ip6addr"));
const chalk_1 = __importDefault(require("chalk"));
const commander_1 = require("./commander");
const config_1 = require("./config");
let forwardTid = 0;
const queryForward = (packet) => {
    const socket = dgram.createSocket('udp4');
    let timer;
    return new Promise((resolve) => {
        socket.on('message', message => {
            const response = dns_packet_1.default.decode(message);
            if (response.type === 'response') {
                if (timer) {
                    clearTimeout(timer);
                }
                resolve(response);
                socket.close();
            }
        });
        forwardTid = forwardTid < 65535 ? forwardTid + 1 : 1;
        socket.send(dns_packet_1.default.encode(Object.assign(Object.assign({}, packet), { id: forwardTid })), 53, commander_1.commands.forward);
        timer = setTimeout(() => {
            socket.close();
            resolve(undefined);
        }, 5000);
    });
};
const reply = (query, response = undefined, rinfo) => {
    if (response) {
        console.log(chalk_1.default.bgGreen.white(`[RESPONSE][${(new Date).toLocaleString()}]:${query.id}`), JSON.stringify(response.answers));
        server4.send(dns_packet_1.default.encode(Object.assign(Object.assign({}, response), { id: query.id })), rinfo.port, rinfo.address);
    }
    else {
        console.log(chalk_1.default.bgRed.white(`[TIMEOUT][${(new Date).toLocaleString()}]:${query.id}`), JSON.stringify(query.questions));
    }
};
const isPerferIpv6 = (addr) => {
    var _a, _b;
    return (_b = (_a = config_1.configData.preferIpv6) === null || _a === void 0 ? void 0 : _a.some(cirdStr => {
        const cird = cirdStr.split('/');
        if (ip6addr_1.default.createCIDR(cird[0], Number(cird[1] || '128')).contains(addr)) {
            console.log(chalk_1.default.bgYellow.white(`[PERFER][${(new Date).toLocaleString()}]`), addr);
            return true;
        }
        else {
            return false;
        }
    })) !== null && _b !== void 0 ? _b : false;
};
const server4 = dgram.createSocket('udp4');
server4.on('message', (message, rinfo) => __awaiter(void 0, void 0, void 0, function* () {
    const query = dns_packet_1.default.decode(message);
    if (query.type === 'query' && query.questions) {
        console.log(chalk_1.default.bgGray(`[QUERY][${(new Date).toLocaleString()}]:${query.id}`), JSON.stringify(query.questions));
        query.questions.forEach((question) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            if (question.type === 'A') {
                const queryAAAAResult = yield queryForward(Object.assign(Object.assign({}, query), { questions: [
                        Object.assign(Object.assign({}, question), { type: 'AAAA' })
                    ] }));
                if (queryAAAAResult) {
                    if ((_a = queryAAAAResult.answers) === null || _a === void 0 ? void 0 : _a.some(answer => answer.type === 'AAAA' && answer.data && isPerferIpv6(answer.data))) {
                        // 存在AAAA记录,应答无记录
                        reply(query, Object.assign(Object.assign({}, query), { type: 'response', rcode: 'NOERROR', flags: 384, answers: [] }), rinfo);
                    }
                    else {
                        // 不存在AAAA记录,转发A记录
                        const queryAResult = yield queryForward(Object.assign(Object.assign({}, query), { questions: [question] }));
                        reply(query, queryAResult, rinfo);
                    }
                }
                else {
                    console.log(chalk_1.default.bgRed.white(`[TIMEOUT][${(new Date).toLocaleString()}]:${query.id}`), JSON.stringify(query.questions));
                }
            }
            else {
                // 其他请求直接转发
                const queryOtherResult = yield queryForward(Object.assign(Object.assign({}, query), { questions: [question] }));
                reply(query, queryOtherResult, rinfo);
            }
        }));
    }
}));
server4.bind(53, '0.0.0.0');
