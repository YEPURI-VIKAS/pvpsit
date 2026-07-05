import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DoorOpen, Mail, Lock, User, AlertCircle, CheckCircle2, Shield } from 'lucide-react';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();
  const { signup } = useAuth();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signup(email, password, name, role);
      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/20 blur-[100px] pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="bg-white p-3 rounded-2xl text-[#1E3A8A] shadow-xl border border-white/20">
            <DoorOpen size={40} />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 font-heading tracking-tight">
          Create an Account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Join PVPSIT Facility Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="glass-card sm:rounded-2xl sm:px-10 px-4 py-8">
          
          {success ? (
            <div className="text-center py-8">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">Registration Successful!</h3>
              <p className="text-sm text-gray-500 mb-6">
                Please check your email to verify your account, or sign in if email verification is disabled.
              </p>
              <Link
                to="/login"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white bg-[#1E3A8A] hover:bg-[#1E40AF] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E3A8A] transition-colors"
              >
                Go to Login
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSignup}>
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start">
                  <AlertCircle className="text-red-500 mr-3 shrink-0" size={20} />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="appearance-none block w-full pl-10 px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#1E3A8A] focus:border-[#1E3A8A] sm:text-sm transition-colors"
                    placeholder="John Doe"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email address</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full pl-10 px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#1E3A8A] focus:border-[#1E3A8A] sm:text-sm transition-colors"
                    placeholder="user@pvpsit.edu.in"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="appearance-none block w-full pl-10 px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-[#1E3A8A] focus:border-[#1E3A8A] sm:text-sm transition-colors bg-white"
                  >
                    <option value="Student">Student</option>
                    <option value="Faculty / Staff">Faculty / Staff</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full pl-10 px-3 py-2.5 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#1E3A8A] focus:border-[#1E3A8A] sm:text-sm transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-medium text-white bg-[#1E3A8A] hover:bg-[#1E40AF] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E3A8A] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating account...
                    </span>
                  ) : (
                    'Sign up'
                  )}
                </button>
              </div>
            </form>
          )}

          {!success && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white/80 text-gray-500 rounded-md backdrop-blur-sm">Already have an account?</span>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Link 
                  to="/login" 
                  className="font-medium text-[#1E3A8A] hover:text-[#1E40AF] transition-colors"
                >
                  Sign in instead
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Signup;
