"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractPaymentGateway = void 0;
const logger_ts_1 = require("../logger/logger.ts");
class AbstractPaymentGateway {
    credentials;
    environment;
    merchantId;
    correlationId;
    constructor(credentials, environment, merchantId) {
        this.credentials = credentials;
        this.environment = environment;
        this.merchantId = merchantId;
        this.correlationId = 'corr_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
    }
    // --- Base Gateway Responsibilities (Shared Functionality) ---
    validateRequest(request) {
        if (!request) {
            throw new Error(`[Correlation ID: ${this.correlationId}] Request payload cannot be empty.`);
        }
    }
    buildHeaders(customHeaders = {}) {
        return {
            'Content-Type': 'application/json',
            'X-Correlation-ID': this.correlationId,
            ...customHeaders
        };
    }
    auditGatewayRequest(action, payload) {
        const sanitized = { ...payload };
        if (sanitized.card) {
            sanitized.card = {
                ...sanitized.card,
                pan: 'XXXX-XXXX-XXXX-' + sanitized.card.pan.slice(-4),
                cvv: 'XXX'
            };
        }
        if (sanitized.echeck) {
            sanitized.echeck = {
                ...sanitized.echeck,
                accountNumber: 'XXXX-XXXX-' + sanitized.echeck.accountNumber.slice(-4)
            };
        }
        logger_ts_1.logger.info({
            correlationId: this.correlationId,
            action,
            merchantId: this.merchantId,
            environment: this.environment,
            payload: sanitized
        }, `[Gateway Audit Request] ${action}`);
    }
    auditGatewayResponse(action, response) {
        logger_ts_1.logger.info({
            correlationId: this.correlationId,
            action,
            merchantId: this.merchantId,
            environment: this.environment,
            response
        }, `[Gateway Audit Response] ${action}`);
    }
    mapGatewayError(action, error) {
        const errorMsg = error.response?.data?.error?.message || error.message || 'Unknown network error';
        logger_ts_1.logger.error({
            correlationId: this.correlationId,
            action,
            error: errorMsg
        }, `[Gateway Execution Failure] ${action}`);
        return new Error(`GatewayExecutionError [Correlation: ${this.correlationId}]: ${errorMsg}`);
    }
}
exports.AbstractPaymentGateway = AbstractPaymentGateway;
exports.default = AbstractPaymentGateway;
