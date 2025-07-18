"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jwt = __importStar(require("jsonwebtoken"));
const config_1 = require("../config");
class UserModel {
    constructor(database) {
        this.db = database;
    }
    async create(userData) {
        const { email, password, firstName, lastName, phoneNumber } = userData;
        const saltRounds = 12;
        const passwordHash = await bcrypt_1.default.hash(password, saltRounds);
        const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, phone_number)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, first_name, last_name, phone_number, created_at, updated_at
    `;
        const values = [email, passwordHash, firstName, lastName, phoneNumber];
        const result = await this.db.query(query, values);
        const row = result.rows[0];
        return {
            id: row.id,
            email: row.email,
            passwordHash,
            profile: {
                firstName: row.first_name,
                lastName: row.last_name,
                phoneNumber: row.phone_number,
            },
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    async findByEmail(email) {
        const query = `
      SELECT id, email, password_hash, first_name, last_name, phone_number, 
             date_of_birth, passport_number, created_at, updated_at
      FROM users 
      WHERE email = $1
    `;
        const result = await this.db.query(query, [email]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        return {
            id: row.id,
            email: row.email,
            passwordHash: row.password_hash,
            profile: {
                firstName: row.first_name,
                lastName: row.last_name,
                phoneNumber: row.phone_number,
                dateOfBirth: row.date_of_birth,
                passportNumber: row.passport_number,
            },
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    async findById(id) {
        const query = `
      SELECT id, email, password_hash, first_name, last_name, phone_number, 
             date_of_birth, passport_number, created_at, updated_at
      FROM users 
      WHERE id = $1
    `;
        const result = await this.db.query(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        return {
            id: row.id,
            email: row.email,
            passwordHash: row.password_hash,
            profile: {
                firstName: row.first_name,
                lastName: row.last_name,
                phoneNumber: row.phone_number,
                dateOfBirth: row.date_of_birth,
                passportNumber: row.passport_number,
            },
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    async updateProfile(id, profileData) {
        const { firstName, lastName, phoneNumber, dateOfBirth, passportNumber } = profileData;
        const query = `
      UPDATE users 
      SET first_name = COALESCE($2, first_name),
          last_name = COALESCE($3, last_name),
          phone_number = COALESCE($4, phone_number),
          date_of_birth = COALESCE($5, date_of_birth),
          passport_number = COALESCE($6, passport_number),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, first_name, last_name, phone_number, 
                date_of_birth, passport_number, created_at, updated_at
    `;
        const values = [id, firstName, lastName, phoneNumber, dateOfBirth, passportNumber];
        const result = await this.db.query(query, values);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        return {
            id: row.id,
            email: row.email,
            passwordHash: '',
            profile: {
                firstName: row.first_name,
                lastName: row.last_name,
                phoneNumber: row.phone_number,
                dateOfBirth: row.date_of_birth,
                passportNumber: row.passport_number,
            },
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    async verifyPassword(plainPassword, hashedPassword) {
        return bcrypt_1.default.compare(plainPassword, hashedPassword);
    }
    generateAuthToken(user) {
        const payload = {
            id: user.id,
            email: user.email,
        };
        const secret = config_1.config.jwt.secret;
        const expiresIn = config_1.config.jwt.expiresIn;
        const token = jwt.sign(payload, secret, { expiresIn });
        return {
            token,
            expiresIn: expiresIn,
        };
    }
    verifyAuthToken(token) {
        try {
            const secret = config_1.config.jwt.secret;
            return jwt.verify(token, secret);
        }
        catch (error) {
            throw new Error('Invalid or expired token');
        }
    }
    toPublicUser(user) {
        const { passwordHash, ...publicUser } = user;
        return publicUser;
    }
}
exports.UserModel = UserModel;
//# sourceMappingURL=User.js.map