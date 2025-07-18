"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const User_1 = require("../models/User");
class AuthService {
    constructor(database) {
        this.userModel = new User_1.UserModel(database);
    }
    async register(userData) {
        const existingUser = await this.userModel.findByEmail(userData.email);
        if (existingUser) {
            throw new Error('User with this email already exists');
        }
        const user = await this.userModel.create(userData);
        const token = this.userModel.generateAuthToken(user);
        return {
            user: this.userModel.toPublicUser(user),
            token,
        };
    }
    async login(credentials) {
        const { email, password } = credentials;
        const user = await this.userModel.findByEmail(email);
        if (!user) {
            throw new Error('Invalid email or password');
        }
        const isValidPassword = await this.userModel.verifyPassword(password, user.passwordHash);
        if (!isValidPassword) {
            throw new Error('Invalid email or password');
        }
        const token = this.userModel.generateAuthToken(user);
        return {
            user: this.userModel.toPublicUser(user),
            token,
        };
    }
    async getUserById(id) {
        const user = await this.userModel.findById(id);
        if (!user) {
            return null;
        }
        return this.userModel.toPublicUser(user);
    }
    async updateUserProfile(id, profileData) {
        const updatedUser = await this.userModel.updateProfile(id, profileData);
        if (!updatedUser) {
            return null;
        }
        return this.userModel.toPublicUser(updatedUser);
    }
    verifyToken(token) {
        return this.userModel.verifyAuthToken(token);
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=AuthService.js.map