import { useMemo, useEffect, useState } from "react";
import { useQuery, useMutation } from '@tanstack/react-query';
import jwt from 'jsonwebtoken';

const prefixUrl = process.env.REACT_APP_API_URL + "/api/auth";

export default function useLogin(props) {
    const doAuthorize = props.doAuthorize ?? false;

    const [accessToken, setAccessToken] = useState(localStorage.getItem("accessToken"));
    const [result, setResult] = useState(null);

    const { data: accountData, isLoading: isAuthorizing } = useQuery({
        queryKey: ['authorize', accessToken],
        queryFn: async () => {
            if (!accessToken) return null;
            const response = await fetch(`${prefixUrl}/authorize-user`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                mode: 'cors',
                credentials: "include"
            });
            if (!response.ok) {
                throw new Error("Invalid access token");
            }
            return response.json();
        },
        enabled: doAuthorize && !!accessToken,
        onError: (error) => {
            console.error("Invalid access token:", error);
        }
    });
    const loggedIn = useMemo(() => {
        return !!accountData;
    }, [accountData]);

    const { data: signUpResult, mutateAsync: handleSignUp, isLoading: isSigningUp } = useMutation({
        mutationFn: async (formData) => {
            const { username, password, orgId, email, phoneNumber, isMain } = formData;
            const response = await fetch(`${prefixUrl}/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                mode: 'cors',
                body: JSON.stringify({
                    username,
                    password,
                    orgId,
                    email,
                    phoneNumber,
                    isMain
                })
            });
            if (!response.ok) {
                throw new Error("Signup failed");
            }
            setResult({ success: true, method: "handleSignUp" });
        },
        onError: (error) => {
            console.error("Signup error:", error);
            setResult({ success: false, method: "handleSignUp" });
        }
    });

    const { data: signUpAdminResult, mutateAsync: handleSignUpAdmin, isLoading: isSigningUpAdmin } = useMutation({
        mutationFn: async (formData) => {
            const { username, password, orgId, email, phoneNumber, isMain } = formData;
            const response = await fetch(`${prefixUrl}/signup-admin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                mode: 'cors',
                body: JSON.stringify({
                    username,
                    password,
                    orgId: 1,
                    email: String(email ?? ""),
                    phoneNumber: String(phoneNumber ?? ""),
                    isMain: true
                })
            });
            if (!response.ok) {
                throw new Error("Admin signup failed");
            }
            const data = await response.text();
            console.log("Admin signup done:", data);
            const response_1 = await fetch(`${prefixUrl}/user-role-v2`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                mode: 'cors',
                body: JSON.stringify({
                    username,
                    roleName: "Admin"
                })
            });
            if (!response_1.ok) {
                throw new Error("Assigning admin role failed");
            }
            const data_1 = await response_1.json();
            console.log("Assign role done:", data_1);
            setResult({ success: true, method: "handleSignUpAdmin" });
        },
        onError: (error) => {
            console.error("Admin signup error:", error);
            setResult({ success: false, method: "handleSignUpAdmin" });
        }
    });

    const { data: loginResult, mutateAsync: handleLogin, isLoading: isLoggingIn } = useMutation({
        mutationFn: async (formData) => {
            const { username, password } = formData;
            const response = await fetch(`${prefixUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                mode: 'cors',
                body: JSON.stringify({ username, password }),
                credentials: "include"
            });
            if (!response.ok) {
                throw new Error("Login failed");
            }
            const data = await response.json();
            if (!data?.['accessToken']) {
                throw new Error("Login failed. No access token found.");
            }
            setAccessToken(data['accessToken']);
            return data;
        },
        onError: (error) => {
            console.error("Login error:", error);
        }
    });

    const { data: logoutResult, mutateAsync: handleLogout } = useMutation({
        mutationFn: async () => {
            const response = await fetch(`${prefixUrl}/logout`, {
                method: 'POST',
                mode: "cors",
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            if (!response.ok) {
                throw new Error("Logout failed");
            }
            removeTokens();
            return response;
        },
        onError: (error) => {
            console.error("Logout error:", error);
        }
    });

    const removeTokens = () => {
        [sessionStorage, localStorage].forEach(s => {
            s.removeItem("refreshToken");
            s.removeItem("accessToken");
        });
        setAccessToken(null);
    };

    const account = useMemo(() => {
        return accessToken ? jwt.decode(accessToken) : null;
    }, [accessToken]);

    useEffect(() => {
        if (doAuthorize && accessToken) {
            console.log("Authorizing...");
        }
    }, [accessToken]);

    const loading = isAuthorizing || isSigningUp || isSigningUpAdmin || isLoggingIn;

    return {
        account,
        loading,
        loggedIn,
        handleLogin,
        handleLogout,
        handleSignUp,
        handleSignUpAdmin,
        result,
    };
}