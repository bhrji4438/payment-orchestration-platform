"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnv = void 0;
function validateEnv(specs, serviceName) {
    const errors = [];
    const validated = {};
    for (const spec of specs) {
        const value = process.env[spec.name];
        if (value === undefined || value === '') {
            if (spec.required) {
                errors.push(`Missing required environment variable: ${spec.name}`);
            }
            else {
                validated[spec.name] = spec.default;
                if (spec.default !== undefined) {
                    process.env[spec.name] = String(spec.default);
                }
            }
            continue;
        }
        // In production, guard against using known development defaults for security/secrets
        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction) {
            const devDefaults = [
                'Password@123',
                'cGxhdGZvcm1fbW9kdWxhcl9tb25vbGl0aF9zZWNyZXRfa2V5XzIwMjY=',
                'mock_secret'
            ];
            if (devDefaults.some(d => value.includes(d))) {
                errors.push(`Security Violation: Default development secret detected in ${spec.name} for production environment.`);
            }
        }
        if (spec.type === 'number') {
            const parsed = parseInt(value, 10);
            if (isNaN(parsed)) {
                errors.push(`Environment variable ${spec.name} must be a number, got "${value}"`);
            }
            else {
                validated[spec.name] = parsed;
            }
        }
        else if (spec.type === 'boolean') {
            if (value !== 'true' && value !== 'false') {
                errors.push(`Environment variable ${spec.name} must be a boolean ("true" or "false"), got "${value}"`);
            }
            else {
                validated[spec.name] = value === 'true';
            }
        }
        else if (spec.type === 'url') {
            try {
                new URL(value);
                validated[spec.name] = value;
            }
            catch (e) {
                errors.push(`Environment variable ${spec.name} must be a valid URL, got "${value}"`);
            }
        }
        else {
            validated[spec.name] = value;
        }
    }
    if (errors.length > 0) {
        console.error(`\n❌ [${serviceName}] ENVIRONMENT CONFIGURATION ERROR:`);
        errors.forEach(err => console.error(`   - ${err}`));
        console.error(`Please check your .env file or bootstrap setup.\n`);
        process.exit(1);
    }
    return validated;
}
exports.validateEnv = validateEnv;
