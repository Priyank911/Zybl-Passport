import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { 
  generateFaceVector, 
  storeFaceVectorWithUserId,
  checkExistingFaceVectorForUser,
  checkExistingFaceVector // Keep legacy for backward compatibility
} from '../utils/faceVerification';

const FaceRecognition = ({ 
  walletAddress, 
  userId, // Add userId prop for user-specific storage
  onVerificationComplete, 
  onExistingUserFound,
  className = "" 
}) => {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [blinkCount, setBlinkCount] = useState(0);
  const [currentEAR, setCurrentEAR] = useState(0);
  const [headVerification, setHeadVerification] = useState({
    left: false,
    right: false
  });
  const headVerificationRef = useRef({
    left: false,
    right: false
  });
  const [currentHeadTilt, setCurrentHeadTilt] = useState(0);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [eyesClosed, setEyesClosed] = useState(false);
  const [message, setMessage] = useState('Please look at the camera and blink twice (0/2)');
  const [lastBlinkTime, setLastBlinkTime] = useState(0);
  const [blinkStatus, setBlinkStatus] = useState('EYES OPEN');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const blinkCooldown = 1000;
  const blinkDoneRef = useRef(false);
  const [isCheckingExisting, setIsCheckingExisting] = useState(false);
  const [verificationError, setVerificationError] = useState(null);
  const detectionIntervalRef = useRef(null);
  const [videoDimensions] = useState({ width: 640, height: 480 });

  // Load models and start video
  useEffect(() => {
    const loadModels = async () => {
      try {
        setMessage('Loading face recognition models...');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
          faceapi.nets.faceExpressionNet.loadFromUri('/models')
        ]);
        setModelsLoaded(true);
        setMessage('Models loaded. Please look at the camera and blink twice (0/2)');
        startVideo();
      } catch (error) {
        console.error('Error loading models:', error);
        setVerificationError('Failed to load face recognition models. Please refresh the page.');
      }
    };

    loadModels();    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      // Stop camera when component unmounts
      stopVideo();
    };
  }, []);
  // Handle video stream
  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: videoDimensions.width },
        height: { ideal: videoDimensions.height },
        facingMode: 'user'
      } 
    })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(err => {
            console.error('Error playing video:', err);
          });
        }
      })
      .catch(err => {
        console.error('Error accessing webcam:', err);
        setVerificationError('Error accessing webcam. Please ensure you have granted camera permissions.');
      });
  };
  // Stop video stream and camera
  const stopVideo = () => {
    console.log('Stopping camera stream...');
    
    // Stop face detection interval
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
      console.log('Face detection interval cleared');
    }
    
    // Stop camera stream
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      
      tracks.forEach(track => {
        console.log('Stopping track:', track.kind, track.label);
        track.stop();
      });
      
      videoRef.current.srcObject = null;
      console.log('Camera stopped successfully - light should turn off');
    }
  };

  // Setup face detection
  useEffect(() => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const handleVideoPlay = () => {
      console.log('Video started playing');
      canvas.width = videoDimensions.width;
      canvas.height = videoDimensions.height;
    };

    video.addEventListener('play', handleVideoPlay);
    video.addEventListener('loadedmetadata', () => {
      console.log('Video metadata loaded');
      video.play().catch(err => {
        console.error('Error playing video after metadata loaded:', err);
      });
    });

    const detectFaces = async () => {
      if (!video || !canvas || video.readyState !== 4 || isProcessing) {
        return;
      }

      try {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions();

        const resizedDetections = faceapi.resizeResults(detections, {
          width: videoDimensions.width,
          height: videoDimensions.height
        });

        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw detection overlays
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

        if (detections && detections.length > 0) {
          const landmarks = detections[0].landmarks;
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();
          const nose = landmarks.getNose();
          const jawOutline = landmarks.getJawOutline();

          const leftEAR = calculateEAR(leftEye);
          const rightEAR = calculateEAR(rightEye);
          const averageEAR = (leftEAR + rightEAR) / 2.0;
          
          if (Math.abs(currentEAR - averageEAR) > 0.01) {
            setCurrentEAR(averageEAR);
          }

          const isBlinking = averageEAR < 0.280;
          const currentTime = Date.now();
          
          if (isBlinking !== (blinkStatus === 'BLINK DETECTED')) {
            setBlinkStatus(isBlinking ? 'BLINK DETECTED' : 'EYES OPEN');
          }

          // Blink detection
          if (isBlinking && !eyesClosed && currentTime - lastBlinkTime > blinkCooldown) {
            setEyesClosed(true);
            setLastBlinkTime(currentTime);
            setBlinkCount(prevCount => {
              const newCount = Math.min(prevCount + 1, 2);
              if (newCount === 2) {
                setMessage('Blink verification complete! Now slowly turn your head left');
                blinkDoneRef.current = true;
              } else {
                setMessage(`Please look at the camera and blink twice (${newCount}/2)`);
              }
              return newCount;
            });
          } else if (!isBlinking && eyesClosed) {
            setEyesClosed(false);
          }

          // Head movement detection
          if ((blinkCount === 2 || blinkDoneRef.current) && !verificationComplete) {
            const jawCenter = jawOutline[8];
            const noseTop = nose[0];

            if (!jawCenter || !noseTop || !leftEye || !rightEye) {
              return;
            }

            const leftEyeCenter = {
              x: leftEye.reduce((sum, point) => sum + point.x, 0) / leftEye.length,
              y: leftEye.reduce((sum, point) => sum + point.y, 0) / leftEye.length
            };
            const rightEyeCenter = {
              x: rightEye.reduce((sum, point) => sum + point.x, 0) / rightEye.length,
              y: rightEye.reduce((sum, point) => sum + point.y, 0) / rightEye.length
            };

            const eyeAngle = Math.atan2(rightEyeCenter.y - leftEyeCenter.y, rightEyeCenter.x - leftEyeCenter.x);
            const headTilt = Math.sin(eyeAngle);
            
            if (Math.abs(currentHeadTilt - headTilt) > 0.01) {
              setCurrentHeadTilt(headTilt);
            }

            if (!headVerificationRef.current.left && headTilt < -0.10) {
              headVerificationRef.current.left = true;
              setHeadVerification(prev => ({ ...prev, left: true }));
              setMessage('Great! Now slowly turn your head right');
            }
            
            if (headVerificationRef.current.left && !headVerificationRef.current.right && headTilt > 0.10) {
              headVerificationRef.current.right = true;
              setHeadVerification(prev => ({ ...prev, right: true }));
              setMessage('Liveness verification complete! Processing face data...');
              setVerificationComplete(true);
              
              // Call handleVerificationComplete when verification is done
              handleVerificationComplete();
            } else if (headVerificationRef.current.left && !headVerificationRef.current.right) {
              setMessage(`Turn your head right (tilt: ${headTilt.toFixed(3)})`);
            }
          }

          // Draw progress indicators
          context.font = '16px Arial';
          context.fillStyle = '#0052FF';
          context.fillText(`Blinks: ${blinkCount}/2`, 10, 30);
          context.fillText(`Head Left: ${headVerificationRef.current.left ? '✓' : '✗'}`, 10, 50);
          context.fillText(`Head Right: ${headVerificationRef.current.right ? '✓' : '✗'}`, 10, 70);
        } else {
          // No face detected
          const context = canvas.getContext('2d');
          context.font = '18px Arial';
          context.fillStyle = '#ff6b6b';
          context.fillText('No face detected - please position yourself in the camera', 10, 30);
        }
      } catch (error) {
        console.error('Error in face detection:', error);
      }
    };

    detectionIntervalRef.current = setInterval(detectFaces, 100);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      video.removeEventListener('play', handleVideoPlay);
    };
  }, [modelsLoaded, currentEAR, blinkStatus, eyesClosed, lastBlinkTime, blinkCount, verificationComplete, videoDimensions, isProcessing]);

  const calculateEAR = (eye) => {
    try {
      const p2_p6 = euclideanDistance(eye[1], eye[5]);
      const p3_p5 = euclideanDistance(eye[2], eye[4]);
      const p1_p4 = euclideanDistance(eye[0], eye[3]);
      
      if (p1_p4 === 0) return 0.35;
      
      const ear = (p2_p6 + p3_p5) / (2.0 * p1_p4);
      return Math.min(Math.max(ear, 0.1), 0.45);
    } catch (error) {
      console.error('Error calculating EAR:', error);
      return 0.35;
    }
  };

  const euclideanDistance = (point1, point2) => {
    return Math.sqrt(
      Math.pow(point2.x - point1.x, 2) + 
      Math.pow(point2.y - point1.y, 2)
    );
  };

  const handleVerificationComplete = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      setMessage('Generating unique face signature...');
      const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (!detections || detections.length === 0) {
        throw new Error('No face detected for signature generation');
      }

      setMessage('Checking for existing verification...');
      setIsCheckingExisting(true);      const faceVector = generateFaceVector(detections[0]);
      
      // Use the unique session ID (userId) as the primary identifier
      const userIdentifier = userId || walletAddress || 'anonymous-user';
      
      console.log('Face verification for user:', {
        userId: userId,
        walletAddress: walletAddress,
        usingIdentifier: userIdentifier
      });
      
      // Check if this face already exists for this specific user
      let existingFace = null;
      
      if (userId) {
        // Use the new user-specific check with the unique session ID
        console.log('Checking existing face vector for unique user ID:', userId);
        existingFace = await checkExistingFaceVectorForUser(faceVector, userId);
      } else if (walletAddress) {
        // Fallback to legacy check for backward compatibility
        console.log('Using legacy face vector check for wallet address:', walletAddress);
        existingFace = await checkExistingFaceVector(faceVector);
      }
        if (existingFace) {
        // This face has already been verified before for this user
        const similarityPercent = Math.round(existingFace.similarity * 100);
          setMessage(`Identity verified! Welcome back (${similarityPercent}% match)`);
        console.log('Existing user found with unique ID:', userId, 'similarity:', similarityPercent + '%');
        
        // Stop camera since verification is complete
        setTimeout(() => {
          setMessage('Verification complete! Camera stopping...');
          stopVideo();
        }, 1000);
        
        // Call the existing user callback
        if (onExistingUserFound) {
          setTimeout(() => {
            onExistingUserFound(existingFace);
          }, 2000);
        }
        return;
      }
      
      setMessage('New user detected. Storing face signature securely...');
      try {
        let stored = false;
        
        // Use the unique session ID for storage
        if (userId) {
          console.log('Storing face vector for unique user ID:', userId);
          stored = await storeFaceVectorWithUserId(faceVector, userId, walletAddress);
        } else if (walletAddress) {
          // Fallback to legacy storage for backward compatibility
          console.log('Using legacy face vector storage for wallet address:', walletAddress);
          const { storeFaceVectorWithWallet } = await import('../utils/faceVerification');
          stored = await storeFaceVectorWithWallet(faceVector, walletAddress);
        }
        
        if (stored) {
          console.log('Face vector successfully stored for user:', userIdentifier);
        } else {
          console.warn('Face vector storage failed or skipped for user:', userIdentifier);
        }
      } catch (error) {
        console.warn('Face vector storage failed:', error);
        // Continue with verification even if storage fails
      }      setMessage('Face verification complete! Proceeding to next step...');
      
      // Stop camera since verification is complete
      setTimeout(() => {
        setMessage('Verification complete! Camera stopping...');
        stopVideo();
      }, 1000);
      
      if (onVerificationComplete) {
        setTimeout(() => {
          onVerificationComplete(faceVector);
        }, 1500);
      }    } catch (error) {
      console.error('Verification error:', error);
      setVerificationError(`Verification failed: ${error.message}`);
      
      // Stop camera on error as well
      setTimeout(() => {
        stopVideo();
      }, 1000);
    } finally {
      setIsCheckingExisting(false);
      setIsProcessing(false);
    }
  };

  // Helper for progress calculation
  const getProgress = () => {
    let progress = 0;
    if (blinkCount >= 2) progress += 0.5;
    if (headVerification.left) progress += 0.25;
    if (headVerification.right) progress += 0.25;
    return progress;
  };  return (
    <div className={`face-recognition-container ${className}`}>
      {/* Status Message */}
      <div className="face-status-message">
        {verificationError ? (
          <div className="error-message">{verificationError}</div>
        ) : (
          <div className="status-message">{message}</div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="face-progress-bar">
        <div 
          className="face-progress-fill" 
          style={{ width: `${getProgress() * 100}%` }}
        />
      </div>

      {/* Main Content Layout */}
      <div className="face-main-content">
        {/* Large Video Section */}
        <div className="face-video-section">
          <div className="face-video-container">
            <video
              ref={videoRef}
              width={videoDimensions.width}
              height={videoDimensions.height}
              autoPlay
              muted
              playsInline
              className="face-video"
            />
            <canvas
              ref={canvasRef}
              width={videoDimensions.width}
              height={videoDimensions.height}
              className="face-canvas"
            />
            
            {(!modelsLoaded || isCheckingExisting) && (
              <div className="loading-overlay">
                <div className="loading-spinner"></div>
                <span>
                  {!modelsLoaded ? 'Loading AI models...' : 'Checking existing verification...'}
                </span>
              </div>
            )}
          </div>          {/* Compact Verification Steps */}
          <div className="verification-steps">
            <div className={`verification-step ${blinkCount >= 2 ? 'completed' : 'active'}`}>
              <div className="step-indicator">1</div>
              <div className="step-content">
                <span className="step-title">Blink Detection</span>
                <span className="step-status">({blinkCount}/2)</span>
              </div>
            </div>
            <div className={`verification-step ${headVerification.left ? 'completed' : blinkCount >= 2 ? 'active' : 'pending'}`}>
              <div className="step-indicator">2</div>
              <div className="step-content">
                <span className="step-title">Turn Head Left</span>
                {headVerification.left && <span className="step-check">✓</span>}
              </div>
            </div>
            <div className={`verification-step ${headVerification.right ? 'completed' : headVerification.left ? 'active' : 'pending'}`}>
              <div className="step-indicator">3</div>
              <div className="step-content">
                <span className="step-title">Turn Head Right</span>
                {headVerification.right && <span className="step-check">✓</span>}
              </div>
            </div>
          </div>
        </div>        {/* Compact Info Section */}
        <div className="face-info-section">
          {/* Tips Card */}
          {/* <div className="face-info-card">
            <h3>✨ Verification Tips</h3>
            <div className="tip-grid">
              <div className="tip-item">
                <span className="tip-icon">📷</span>
                <span>Face camera directly</span>
              </div>
              <div className="tip-item">
                <span className="tip-icon">💡</span>
                <span>Ensure good lighting</span>
              </div>
              <div className="tip-item">
                <span className="tip-icon">👓</span>
                <span>Remove glasses if needed</span>
              </div>
              <div className="tip-item">
                <span className="tip-icon">🎯</span>
                <span>Keep face centered</span>
              </div>
            </div>
          </div> */}

          {/* Live Metrics Card */}
          {modelsLoaded && (
            <div className="face-info-card">
              <h3>📊 Live Performance Data</h3>
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-label">Eye Ratio</div>
                  <div className={`metric-value ${currentEAR > 0.25 ? 'good' : 'warning'}`}>
                    {currentEAR.toFixed(3)}
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Head Tilt</div>
                  <div className={`metric-value ${Math.abs(currentHeadTilt) < 15 ? 'good' : 'warning'}`}>
                    {currentHeadTilt.toFixed(1)}°
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Blink Status</div>
                  <div className={`metric-value ${blinkStatus === 'EYES OPEN' ? 'good' : 'warning'}`}>
                    {blinkStatus === 'EYES OPEN' ? 'OPEN' : 'BLINK'}
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Progress</div>
                  <div className={`metric-value ${getProgress() > 0.7 ? 'good' : 'warning'}`}>
                    {Math.round(getProgress() * 100)}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FaceRecognition;
