// Simple QR scanner without external libraries
function startSimpleQrScanner() {
  console.log('Starting simple QR scanner...');
  
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      console.log('Camera access granted');
      const video = document.getElementById('qrVideo');
      video.srcObject = stream;
      video.play();
      
      document.getElementById('qrScanner').classList.remove('hidden');
      
      // Simple detection loop
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      function scan() {
        if (video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          
          // Convert to image data for QR detection
          const imageData = canvas.toDataURL('image/png');
          console.log('Frame captured, size:', canvas.width, 'x', canvas.height);
        }
        
        setTimeout(scan, 500); // Scan every 500ms
      }
      
      video.addEventListener('loadedmetadata', () => {
        console.log('Video loaded, starting scan loop');
        scan();
      });
    })
    .catch(err => {
      console.error('Camera error:', err);
      alert('Camera access failed: ' + err.message);
    });
}

// Simple file QR reader
function readQrFromFile() {
  console.log('Opening file picker...');
  
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    console.log('File selected:', file.name);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        console.log('Image loaded, size:', img.width, 'x', img.height);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // For now, just show success
        alert('Image loaded successfully. QR detection would happen here.');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };
  
  input.click();
}