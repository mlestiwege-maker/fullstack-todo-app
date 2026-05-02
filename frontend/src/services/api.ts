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

export interface TodoItem {
  id: number;
  title: string;
  completed: boolean;
}

export interface TodoCreatePayload {
  title: string;
}

export interface TodoUpdatePayload {
  title?: string;
  completed?: boolean;
}

export interface TodoDeleteResponse {
  message: string;
  id: number;
}

export default API;