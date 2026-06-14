"use client";

import React, { useState } from 'react';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLogin } from '@/hooks/auth/useLogin';
import toast from 'react-hot-toast';
import * as yup from 'yup';

const loginSchema = yup.object().shape({
    email: yup
        .string()
        .email('Your email is invalid.')
        .required('Email is required'),
    password: yup
        .string()
        .min(4, 'Password must be at least 4 characters.')
        .required('Password is required')
});

const SignInForm = () => {
    const router = useRouter();
    const { mutateAsync: login, isPending } = useLogin();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false
    });
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState('');

    const validateField = async (name, value) => {
        try {
            await yup.reach(loginSchema, name).validate(value);
            setErrors(prev => ({ ...prev, [name]: null }));
            return true;
        } catch (error) {
            setErrors(prev => ({ ...prev, [name]: error.message }));
            return false;
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
        if (apiError) {
            setApiError('');
        }
        if (name === 'email' || name === 'password') {
            validateField(name, value);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setApiError('');

        try {
            await loginSchema.validate(formData, { abortEarly: false });
            setErrors({});
        } catch (validationError) {
            const validationErrors = {};
            if (validationError.inner) {
                validationError.inner.forEach((err) => {
                    validationErrors[err.path] = err.message;
                });
            }
            setErrors(validationErrors);
            setIsLoading(false);
            return;
        }

        try {
            await login({
                email: formData.email,
                password: formData.password
            });
            toast.success('Login successful!');
            router.push('/dashboard');
        } catch (error) {
            const message = error?.response?.data?.message || error?.message || 'Login failed';
            setApiError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const busy = isLoading || isPending;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/50 to-slate-200 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-customBlue/10 blur-3xl" />
                <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-indigo-400/10 blur-3xl" />
            </div>

            <div className="relative w-full max-w-md sm:max-w-lg">
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
                    <div className="bg-gradient-to-r from-customBlue to-[#3d5ae8] px-6 sm:px-8 py-8 sm:py-10 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                            <Shield className="h-7 w-7 text-white" strokeWidth={2} />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                            Welcome back
                        </h1>
                        <p className="mt-2 text-sm sm:text-base text-blue-100/90">
                            Sign in with your authorized credentials
                        </p>
                    </div>

                    <div className="px-6 sm:px-8 py-7 sm:py-8">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {apiError && (
                                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl">
                                    <p className="text-sm text-red-700">{apiError}</p>
                                </div>
                            )}

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    onBlur={(e) => validateField(e.target.name, e.target.value)}
                                    disabled={busy}
                                    placeholder="you@company.com"
                                    className={`w-full px-4 py-3 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-customBlue/25 focus:border-customBlue transition ${
                                        errors.email
                                            ? 'border-red-400 bg-red-50/50'
                                            : 'border-slate-200 hover:border-slate-300'
                                    } ${busy ? 'bg-slate-50 cursor-not-allowed' : ''}`}
                                />
                                {errors.email && (
                                    <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        onBlur={(e) => validateField(e.target.name, e.target.value)}
                                        disabled={busy}
                                        placeholder="Enter your password"
                                        className={`w-full pr-11 px-4 py-3 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-customBlue/25 focus:border-customBlue transition ${
                                            errors.password
                                                ? 'border-red-400 bg-red-50/50'
                                                : 'border-slate-200 hover:border-slate-300'
                                        } ${busy ? 'bg-slate-50 cursor-not-allowed' : ''}`}
                                    />
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-customBlue transition-colors"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        disabled={busy}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <label htmlFor="rememberMeToggle" className="relative inline-block w-11 h-6 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        id="rememberMeToggle"
                                        name="rememberMe"
                                        checked={formData.rememberMe}
                                        onChange={handleChange}
                                        disabled={busy}
                                        className="sr-only"
                                    />
                                    <div
                                        className={`relative block w-11 h-6 rounded-full transition-colors duration-200 ${
                                            formData.rememberMe ? 'bg-customBlue' : 'bg-slate-300'
                                        } ${busy ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <div
                                            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${
                                                formData.rememberMe ? 'translate-x-5' : 'translate-x-0.5'
                                            }`}
                                        />
                                    </div>
                                </label>
                                <label
                                    htmlFor="rememberMeToggle"
                                    className={`text-sm text-slate-600 cursor-pointer select-none ${busy ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Remember me
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={busy}
                                className="w-full bg-customBlue text-white text-sm font-semibold py-3.5 rounded-xl hover:bg-[#4660e0] focus:outline-none focus:ring-4 focus:ring-customBlue/20 transition-all shadow-md shadow-customBlue/20 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {busy && (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                )}
                                {busy ? 'Signing in...' : 'Sign in'}
                            </button>
                        </form>
                    </div>
                </div>

                <p className="mt-6 text-center text-xs text-slate-500">
                    Crescent Inventory Management System
                </p>
            </div>
        </div>
    );
};

export default SignInForm;
