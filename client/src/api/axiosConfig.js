import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request Interceptor
axiosInstance.interceptors.request.use(
    (config) => {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        if (user && user.token) {
            config.headers.Authorization = `Bearer ${user.token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor for Global Error Handling
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        const message = error.response?.data?.message || 'Something went wrong';
        
        // You can add global toast notifications here later
        console.error('🌐 API Error:', message);
        
        if (error.response?.status === 401) {
            // Handle unauthorized (e.g., logout or redirect)
            // localStorage.removeItem('currentUser');
            // window.location.href = '/login';
        }
        
        return Promise.reject(error);
    }
);

export default axiosInstance;
