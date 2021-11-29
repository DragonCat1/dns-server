"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configData = void 0;
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const defaultConfigFiles = {
    preferIpv6: './config/prefer_ipv6.list'
};
const configData = {};
exports.configData = configData;
if (fs_1.default.existsSync(defaultConfigFiles.preferIpv6)) {
    const preferIpv6Data = fs_1.default.readFileSync(defaultConfigFiles.preferIpv6).toString();
    configData.preferIpv6 = preferIpv6Data.split(os_1.default.EOL).filter(el => el !== '');
}
