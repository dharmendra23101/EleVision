import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../hooks/useAuth'

const Profile = () => {
  const { profile, updateProfile, user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      fullName: profile?.full_name || '',
      mobileNumber: profile?.mobile_number || '',
      state: profile?.state || '',
      district: profile?. district || '',
      villageCity: profile?.village_city || '',
    },
  })

  React.useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.full_name || '',
        mobileNumber: profile.mobile_number || '',
        state: profile.state || '',
        district: profile.district || '',
        villageCity: profile. village_city || '',
      })
    }
  }, [profile, reset])

  const onSubmit = async (data) => {
    setLoading(true)
    setMessage('')

    try {
      const updates = {
        full_name: data.fullName,
        mobile_number: data.mobileNumber,
        state: data.state,
        district: data.district,
        village_city: data.villageCity,
        updated_at: new Date().toISOString(),
      }

      const { error } = await updateProfile(updates)
      
      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage('Profile updated successfully!')
        setIsEditing(false)
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (err) {
      setMessage('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    reset()
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Profile...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
              {! isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-primary"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          <div className="px-6 py-4">
            {message && (
              <div className={`mb-4 px-4 py-3 rounded-md ${
                message.startsWith('Error') 
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-green-50 border border-green-200 text-green-700'
              }`}>
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user?. email || ''}
                    disabled
                    className="mt-1 input-field bg-gray-100 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                </div>

                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    {... register('fullName', {
                      required: 'Full name is required',
                      minLength: {
                        value: 2,
                        message: 'Full name must be at least 2 characters',
                      },
                    })}
                    type="text"
                    disabled={! isEditing}
                    className={`mt-1 input-field ${! isEditing ?  'bg-gray-50' : ''}`}
                  />
                  {errors.fullName && isEditing && (
                    <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
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
                    disabled={!isEditing}
                    className={`mt-1 input-field ${!isEditing ? 'bg-gray-50' : ''}`}
                  />
                  {errors.mobileNumber && isEditing && (
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
                    disabled={!isEditing}
                    className={`mt-1 input-field ${!isEditing ? 'bg-gray-50' : ''}`}
                  />
                  {errors.state && isEditing && (
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
                    disabled={!isEditing}
                    className={`mt-1 input-field ${!isEditing ? 'bg-gray-50' : ''}`}
                  />
                  {errors.district && isEditing && (
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
                    disabled={!isEditing}
                    className={`mt-1 input-field ${!isEditing ?  'bg-gray-50' : ''}`}
                  />
                  {errors.villageCity && isEditing && (
                    <p className="mt-1 text-sm text-red-600">{errors.villageCity.message}</p>
                  )}
                </div>

                {profile.is_admin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Account Type
                    </label>
                    <div className="mt-1 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md">
                      <span className="text-blue-800 font-medium">Administrator</span>
                    </div>
                  </div>
                )}

                <div className="text-sm text-gray-500">
                  <p>Account created: {new Date(profile.created_at). toLocaleDateString()}</p>
                  {profile.updated_at && (
                    <p>Last updated: {new Date(profile.updated_at).toLocaleDateString()}</p>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="mt-6 flex space-x-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile