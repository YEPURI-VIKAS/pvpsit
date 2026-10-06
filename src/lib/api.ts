export const checkAndReleaseFacilities = async () => {
  // Can be implemented by the backend on a cron job or scheduled task.
  // For now, this is a no-op on the frontend.
};

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const getHeaders = () => {
  const token = localStorage.getItem('jwt_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${response.status} ${response.statusText}`);
  }

  // Handle empty responses (like 204 No Content)
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export const api = {
  get<T>(endpoint: string): Promise<T> {
    return fetchWithAuth(endpoint, { method: 'GET' }) as Promise<T>;
  },

  post<T>(endpoint: string, body: any): Promise<T> {
    return fetchWithAuth(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }) as Promise<T>;
  },

  patch<T>(endpoint: string, body: any): Promise<T> {
    return fetchWithAuth(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }) as Promise<T>;
  },

  put<T>(endpoint: string, body: any): Promise<T> {
    return fetchWithAuth(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    }) as Promise<T>;
  },

  delete<T>(endpoint: string): Promise<T> {
    return fetchWithAuth(endpoint, { method: 'DELETE' }) as Promise<T>;
  },
};

export async function uploadImage(file: File, bucket: string = 'facility-photos'): Promise<string> {
  // To be implemented on the backend
  console.warn("Image upload is mocked because the backend endpoint is not yet implemented.", file.name, bucket);
  return "https://images.unsplash.com/photo-1562774053-701939374585?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80";
}
