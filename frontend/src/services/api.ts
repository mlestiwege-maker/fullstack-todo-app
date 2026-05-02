import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000",
});

export interface AuthPayload {
  username: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
}

export interface LoginResponse {
  access_token: string;
}

export interface ProtectedResponse {
  message: string;
}

export default API;