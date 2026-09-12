import React from 'react';

interface QRCodeProps {
  url: string;
}

const QRCode: React.FC<QRCodeProps> = ({ url }) => {
  // Use an external API to generate a scannable QR code image.
  // The 'qzone' parameter adds a quiet zone (margin) around the code for better scannability.
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}&qzone=1`;

  return (
    <img 
      src={qrCodeUrl} 
      alt="QR Code to join the game" 
      width="160" 
      height="160"
      className="block" // Use block to avoid extra space under the image
      title={`Scan to join: ${url}`}
    />
  );
};

export default QRCode;
