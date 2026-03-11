import React from 'react';
import { BookOpen } from 'lucide-react';

// Glassmorphic Flip Card - Student Hub Design System
// Adapts the Uiverse flip card to Glassmorphic Stealth theme

const FlipCard = ({
    badge = "Study",
    title = "Quick Review",
    subtitle = "Flashcards",
    time = "15 Mins",
    servings = "1 Deck"
}) => {
    return (
        <div className="flip-card-container" style={{
            '--bg-page': '#0B0E14',
            '--bg-glass': 'rgba(255, 255, 255, 0.05)',
            '--border-glass': '1px solid rgba(255, 255, 255, 0.1)',
            '--accent-primary': '#00F5FF',
            '--accent-secondary': '#B026FF',
            '--text-main': '#F0F4F8',
            '--text-muted': 'rgba(240, 244, 248, 0.5)',
        }}>
            <style>{`
        .flip-card-container {
          overflow: visible;
          width: 200px;
          height: 270px;
        }
        
        .flip-card-content {
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          border-radius: 16px;
        }
        
        .flip-card-front, .flip-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          border-radius: 16px;
          overflow: hidden;
        }
        
        .flip-card-back {
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(16px);
        }
        
        .flip-card-back::before {
          position: absolute;
          content: '';
          display: block;
          width: 180px;
          height: 180%;
          background: linear-gradient(90deg, transparent, rgba(0, 245, 255, 0.3), rgba(176, 38, 255, 0.3), rgba(0, 245, 255, 0.3), transparent);
          animation: flip-rotation 6000ms infinite linear;
        }
        
        .flip-card-back-content {
          position: absolute;
          width: 99%;
          height: 99%;
          background: rgba(11, 14, 20, 0.9);
          border-radius: 16px;
          color: #F0F4F8;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(16px);
        }
        
        .flip-card-container:hover .flip-card-content {
          transform: rotateY(180deg);
        }
        
        @keyframes flip-rotation {
          0% { transform: rotateZ(0deg); }
          100% { transform: rotateZ(360deg); }
        }
        
        .flip-card-front {
          transform: rotateY(180deg);
          color: #F0F4F8;
          background: linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(16px);
        }
        
        .flip-card-front .flip-front-content {
          position: absolute;
          width: 100%;
          height: 100%;
          padding: 16px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
        }
        
        .flip-front-content .flip-badge {
          background: rgba(0, 245, 255, 0.15);
          border: 1px solid rgba(0, 245, 255, 0.3);
          padding: 4px 12px;
          border-radius: 20px;
          backdrop-filter: blur(4px);
          width: fit-content;
          font-size: 11px;
          font-weight: 600;
          color: #00F5FF;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .flip-description {
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
          width: 100%;
          padding: 14px;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .flip-title {
          font-size: 14px;
          max-width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
        }
        
        .flip-title p {
          width: 60%;
          margin: 0;
          color: #F0F4F8;
        }
        
        .flip-card-footer {
          color: rgba(240, 244, 248, 0.5);
          margin-top: 8px;
          font-size: 11px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .flip-card-front .flip-img {
          position: absolute;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          top: 0;
          left: 0;
        }
        
        .flip-circle {
          position: absolute;
          border-radius: 50%;
          filter: blur(20px);
          animation: flip-floating 2600ms infinite linear;
        }
        
        .flip-circle-1 {
          width: 100px;
          height: 100px;
          background: linear-gradient(135deg, #00F5FF 0%, #B026FF 100%);
          top: -20px;
          left: -10px;
          opacity: 0.6;
        }
        
        .flip-circle-2 {
          width: 160px;
          height: 160px;
          background: linear-gradient(135deg, #B026FF 0%, #00F5FF 100%);
          bottom: -40px;
          right: -40px;
          opacity: 0.5;
          animation-delay: -800ms;
        }
        
        .flip-circle-3 {
          width: 40px;
          height: 40px;
          background: #00F5FF;
          top: 50%;
          right: -10px;
          opacity: 0.7;
          animation-delay: -1800ms;
        }
        
        @keyframes flip-floating {
          0% { transform: translateY(0px); }
          50% { transform: translateY(12px); }
          100% { transform: translateY(0px); }
        }
        
        .hover-text {
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          font-size: 16px;
          letter-spacing: 1px;
          background: linear-gradient(135deg, #00F5FF, #B026FF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

            <div className="flip-card-content">
                {/* Back Side - Shows on hover reveal */}
                <div className="flip-card-back">
                    <div className="flip-card-back-content">
                        <BookOpen
                            stroke="#00F5FF"
                            size={48}
                            style={{
                                filter: 'drop-shadow(0 0 10px rgba(0, 245, 255, 0.5))'
                            }}
                        />
                        <span className="hover-text">Hover Me</span>
                    </div>
                </div>

                {/* Front Side - Shows content */}
                <div className="flip-card-front">
                    <div className="flip-img">
                        <div className="flip-circle flip-circle-1"></div>
                        <div className="flip-circle flip-circle-2"></div>
                        <div className="flip-circle flip-circle-3"></div>
                    </div>

                    <div className="flip-front-content">
                        <small className="flip-badge">{badge}</small>
                        <div className="flip-description">
                            <div className="flip-title">
                                <p>{title}</p>
                                <BookOpen size={16} stroke="#00F5FF" />
                            </div>
                            <p className="flip-card-footer">
                                {time} &nbsp; | &nbsp; {servings}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FlipCard;
