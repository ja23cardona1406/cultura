import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  maxRating?: number;
  initialRating?: number | null;
  onChange: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({
  maxRating = 5,
  initialRating = 0,
  onChange,
  size = 'md',
  readOnly = false
}) => {
  const [rating, setRating] = useState<number>(initialRating || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);

  const getStarSize = () => {
    switch (size) {
      case 'sm': return 'h-4 w-4';
      case 'lg': return 'h-7 w-7';
      default: return 'h-5 w-5';
    }
  };

  const handleClick = (index: number) => {
    if (readOnly) return;
    const newRating = index === rating ? index - 1 : index;
    setRating(newRating);
    onChange(newRating);
  };

  const handleMouseEnter = (index: number) => {
    if (readOnly) return;
    setHoverRating(index);
  };

  const handleMouseLeave = () => {
    if (readOnly) return;
    setHoverRating(0);
  };

  const getStarColor = (index: number) => {
    if (hoverRating >= index) {
      return 'text-yellow-400 fill-yellow-400';
    } else if (rating >= index) {
      return 'text-yellow-400 fill-yellow-400';
    }
    return 'text-gray-300';
  };

  return (
    <div className="flex items-center gap-1">
      {[...Array(maxRating)].map((_, index) => (
        <button
          key={index}
          type="button"
          onClick={() => handleClick(index + 1)}
          onMouseEnter={() => handleMouseEnter(index + 1)}
          onMouseLeave={handleMouseLeave}
          className={`focus:outline-none transition-colors duration-200 ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          disabled={readOnly}
        >
          <Star 
            className={`${getStarSize()} ${getStarColor(index + 1)} transition-all duration-150`} 
          />
        </button>
      ))}
      {!readOnly && (
        <span className="text-sm text-gray-500 ml-2">
          {rating > 0 ? `${rating}/${maxRating}` : ''}
        </span>
      )}
    </div>
  );
};

export default StarRating;