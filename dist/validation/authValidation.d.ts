import Joi from 'joi';
export declare const registerSchema: Joi.ObjectSchema<any>;
export declare const loginSchema: Joi.ObjectSchema<any>;
export declare const updateProfileSchema: Joi.ObjectSchema<any>;
export declare const validateRegister: (data: any) => Joi.ValidationResult<any>;
export declare const validateLogin: (data: any) => Joi.ValidationResult<any>;
export declare const validateUpdateProfile: (data: any) => Joi.ValidationResult<any>;
//# sourceMappingURL=authValidation.d.ts.map