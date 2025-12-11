import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../hooks/useAuth'

const Signup = () => {
  const { signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm()

  const password = watch('password')

  const onSubmit = async (data) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const userData = {
        fullName: data.fullName,
        mobileNumber: data. mobileNumber,
        state: data. state,
        district: data.district,
        villageCity: data.villageCity,
      }

      const { data: result, error } = await signUp(data.email, data. password, userData)
      
      if (error) {
        setError(error. message)
      } else if (result?.user) {
        setSuccess('🎉 Account created successfully! You can now login with your credentials.')
        
        // Store credentials for easy login
        localStorage.setItem('loginEmail', data.email)
        
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      }
    } catch (err) {
      console.error('Signup error:', err)
      setError('An unexpected error occurred: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')

    try {
      const { error } = await signInWithGoogle()
      
      if (error) {
        setError(error.message)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              sign in to existing account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
              {success}
              <div className="mt-2">
                <Link
                  to="/login"
                  className="text-green-800 underline hover:text-green-900"
                >
                  Go to Login →
                </Link>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* All form fields remain the same */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                {...register('fullName', {
                  required: 'Full name is required',
                  minLength: {
                    value: 2,
                    message: 'Full name must be at least 2 characters',
                  },
                })}
                type="text"
                autoComplete="name"
                className="input-field mt-1"
                placeholder="Enter your full name"
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors. fullName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: 'Invalid email address',
                  },
                })}
                type="email"
                autoComplete="email"
                className="input-field mt-1"
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email. message}</p>
              )}
            </div>

            <div>
              <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700">
                Mobile Number
              </label>
              <input
                {...register('mobileNumber', {
                  required: 'Mobile number is required',
                  pattern: {
                    value: /^[0-9]{10}$/,
                    message: 'Mobile number must be 10 digits',
                  },
                })}
                type="tel"
                autoComplete="tel"
                className="input-field mt-1"
                placeholder="Enter your mobile number"
              />
              {errors. mobileNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.mobileNumber.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                State
              </label>
              <input
                {...register('state', {
                  required: 'State is required',
                })}
                type="text"
                autoComplete="address-level1"
                className="input-field mt-1"
                placeholder="Enter your state"
              />
              {errors.state && (
                <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="district" className="block text-sm font-medium text-gray-700">
                District
              </label>
              <input
                {...register('district', {
                  required: 'District is required',
                })}
                type="text"
                autoComplete="address-level2"
                className="input-field mt-1"
                placeholder="Enter your district"
              />
              {errors.district && (
                <p className="mt-1 text-sm text-red-600">{errors.district.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="villageCity" className="block text-sm font-medium text-gray-700">
                Village/City
              </label>
              <input
                {...register('villageCity', {
                  required: 'Village/City is required',
                })}
                type="text"
                autoComplete="address-level3"
                className="input-field mt-1"
                placeholder="Enter your village/city"
              />
              {errors.villageCity && (
                <p className="mt-1 text-sm text-red-600">{errors.villageCity.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                })}
                type="password"
                autoComplete="new-password"
                className="input-field mt-1"
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (value) =>
                    value === password || 'The passwords do not match',
                })}
                type="password"
                autoComplete="new-password"
                className="input-field mt-1"
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="w-5 h-5 mr-2 text-blue-600 font-bold text-lg">G</span>
                Continue with Google
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Signup