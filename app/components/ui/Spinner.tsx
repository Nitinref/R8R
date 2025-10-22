import { cn } from '@/app/lib/utils/helpers';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'danger' | 'elegant' | 'modern' | 'pulse';
  className?: string;
  label?: string;
}

export function Spinner({ 
  size = 'md', 
  variant = 'default',
  className,
  label 
}: SpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const variants = {
    default: 'border-gray-200 border-t-red-600 border-r-red-600',
    danger: 'border-red-200 border-t-red-700 border-r-red-800',
    elegant: 'border-gray-300 border-t-black border-r-red-600 border-b-red-600',
    modern: 'border-transparent border-t-red-600 border-r-black border-b-black',
    pulse: 'border-red-100 border-t-red-700 animate-pulse',
  };

  const baseClasses = 'animate-spin rounded-full border-4';

  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <div
        className={cn(
          baseClasses,
          sizes[size],
          variants[variant]
        )}
      />
      {label && (
        <span className={cn(
          'text-sm font-medium',
          variant === 'danger' || variant === 'pulse' ? 'text-red-700' : 'text-gray-700'
        )}>
          {label}
        </span>
      )}
    </div>
  );
}

// Additional specialized spinner components
export function RedBlackSpinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-4 border-black border-t-red-600 border-r-red-600',
          size === 'sm' && 'w-4 h-4',
          size === 'md' && 'w-8 h-8', 
          size === 'lg' && 'w-12 h-12',
          size === 'xl' && 'w-16 h-16'
        )}
      />
    </div>
  );
}

export function GradientSpinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-4 border-transparent',
          'bg-gradient-to-r from-black via-red-600 to-black bg-origin-border',
          size === 'sm' && 'w-4 h-4',
          size === 'md' && 'w-8 h-8',
          size === 'lg' && 'w-12 h-12', 
          size === 'xl' && 'w-16 h-16'
        )}
        style={{
          backgroundImage: 'linear-gradient(45deg, black, red, black)',
          border: '4px solid transparent',
          backgroundClip: 'padding-box'
        }}
      />
    </div>
  );
}

export function DotsSpinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center space-x-1', className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'animate-bounce rounded-full bg-red-600',
            size === 'sm' && 'w-2 h-2',
            size === 'md' && 'w-3 h-3',
            size === 'lg' && 'w-4 h-4'
          )}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
}