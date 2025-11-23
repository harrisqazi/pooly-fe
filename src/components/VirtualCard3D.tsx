import { useState, useRef } from 'react';
import { CreditCard, Wifi } from 'lucide-react';

interface VirtualCard3DProps {
  groupName: string;
  cardStatus: 'active' | 'paused' | 'locked';
  cardImageUrl?: string | null;
  cardNumber?: string;
  expiry?: string;
  cvc?: string;
  onTapToPay?: () => void;
}

export const VirtualCard3D = ({
  groupName,
  cardStatus,
  cardImageUrl,
  cardNumber = '4532 1234 5678 9010',
  expiry = '12/25',
  cvc = '123',
  onTapToPay
}: VirtualCard3DProps) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || isFlipped) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;

    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
  };

  const handleTapToPay = () => {
    setIsFlipped(!isFlipped);
    if (!isFlipped && onTapToPay) {
      setTimeout(() => onTapToPay(), 600);
    }
  };

  const cardBackground = cardImageUrl
    ? `url(${cardImageUrl})`
    : 'linear-gradient(135deg, #16a34a 0%, #059669 100%)';

  return (
    <div
      ref={cardRef}
      className="perspective-1000 w-full max-w-md mx-auto"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="relative w-full h-56 transition-transform duration-600 preserve-3d cursor-pointer"
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) ${isFlipped ? 'rotateY(180deg)' : ''}`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Front of card */}
        <div
          className="absolute inset-0 rounded-2xl shadow-2xl p-6 text-white backface-hidden"
          style={{
            background: cardBackground,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backfaceVisibility: 'hidden',
          }}
        >
          <div className="flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-2xl font-bold">Pooly</div>
                <div className="text-xs opacity-80 mt-1">{groupName}</div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                cardStatus === 'active' ? 'bg-green-500/20 text-green-100' :
                cardStatus === 'paused' ? 'bg-amber-500/20 text-amber-100' :
                'bg-red-500/20 text-red-100'
              }`}>
                {cardStatus.toUpperCase()}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-8 h-8" />
                <button
                  onClick={handleTapToPay}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
                >
                  <Wifi className="w-4 h-4" />
                  <span className="text-sm font-semibold">Tap to Pay</span>
                </button>
              </div>

              <div className="text-lg tracking-wider font-mono">
                {cardNumber}
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <div className="text-xs opacity-70">VALID THRU</div>
                  <div className="font-mono">{expiry}</div>
                </div>
                <div className="text-2xl font-bold">VISA</div>
              </div>
            </div>
          </div>
        </div>

        {/* Back of card */}
        <div
          className="absolute inset-0 rounded-2xl shadow-2xl backface-hidden"
          style={{
            background: cardImageUrl ? `url(${cardImageUrl})` : 'linear-gradient(135deg, #16a34a 0%, #059669 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backfaceVisibility: 'hidden',
            transform: cardImageUrl ? 'rotateY(180deg) scaleX(-1)' : 'rotateY(180deg)',
          }}
        >
          <div className="h-full flex flex-col">
            <div className="h-12 bg-black/40 mt-6"></div>
            <div className="flex-1 p-6 flex flex-col justify-between">
              <div className="flex justify-center items-center gap-4">
                <div
                  onClick={handleTapToPay}
                  className="w-16 h-12 bg-gradient-to-br from-amber-200 to-amber-400 rounded cursor-pointer hover:scale-105 transition-transform flex items-center justify-center relative overflow-hidden"
                >
                  <div className="absolute inset-1 border-2 border-amber-600/30 rounded"></div>
                  <div className="w-6 h-6 rounded-full bg-amber-600/20"></div>
                </div>
                <div className="text-white space-y-1">
                  <div className="text-xs opacity-70">CVC</div>
                  <div className="font-mono font-bold text-lg">{cvc}</div>
                </div>
              </div>
              <div className="text-center text-white/80 text-xs space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <Wifi className="w-4 h-4" />
                  <span>Tap to Pay</span>
                </div>
                <div>This card is enabled for contactless payments</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
