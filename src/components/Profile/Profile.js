import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { updateProfile } from 'firebase/auth';
import { uploadFile } from '../../firebase/services';
import './Profile.css';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profileData, setProfileData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    photoURL: user?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    bio: '',
    interests: []
  });
  const [newPhotoFile, setNewPhotoFile] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewPhotoFile(file);
      // Create a preview URL
      const previewURL = URL.createObjectURL(file);
      setProfileData(prev => ({
        ...prev,
        photoURL: previewURL
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInterestChange = (e) => {
    const value = e.target.value;
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault();
      if (!profileData.interests.includes(value.trim())) {
        setProfileData(prev => ({
          ...prev,
          interests: [...prev.interests, value.trim()]
        }));
      }
      e.target.value = '';
    }
  };

  const removeInterest = (interest) => {
    setProfileData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let photoURL = profileData.photoURL;

      // Upload new photo if changed
      if (newPhotoFile) {
        const photoPath = `profile-photos/${user.uid}/${newPhotoFile.name}`;
        photoURL = await uploadFile(newPhotoFile, photoPath);
      }

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: profileData.displayName,
        photoURL: photoURL
      });

      // Update Firestore user document
      // You can add additional user data to Firestore here

      setIsEditing(false);
      setNewPhotoFile(null);
    } catch (error) {
      setError('Failed to update profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-wrapper">
      <div className="profile-container">
        <div className="profile-header">
          <h1>Profile Settings</h1>
          <button 
            className="edit-button"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="profile-photo-section">
            <div className="profile-photo">
              <img src={profileData.photoURL} alt="Profile" />
              {isEditing && (
                <div className="photo-overlay">
                  <label htmlFor="photo-upload" className="photo-upload-label">
                    <i className="fas fa-camera"></i>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Display Name</label>
            <input
              type="text"
              name="displayName"
              value={profileData.displayName}
              onChange={handleInputChange}
              disabled={!isEditing}
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={profileData.email}
              disabled
              className="disabled"
            />
          </div>

          <div className="form-group">
            <label>Bio</label>
            <textarea
              name="bio"
              value={profileData.bio}
              onChange={handleInputChange}
              disabled={!isEditing}
              rows={4}
              placeholder="Tell us about yourself..."
            />
          </div>

          <div className="form-group">
            <label>Learning Interests</label>
            {isEditing ? (
              <input
                type="text"
                placeholder="Type and press Enter to add interests"
                onKeyDown={handleInterestChange}
              />
            ) : null}
            <div className="interests-list">
              {profileData.interests.map((interest, index) => (
                <span key={index} className="interest-tag">
                  {interest}
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => removeInterest(interest)}
                      className="remove-interest"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>

          {isEditing && (
            <div className="form-actions">
              <button 
                type="submit" 
                className="save-button"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Profile; 