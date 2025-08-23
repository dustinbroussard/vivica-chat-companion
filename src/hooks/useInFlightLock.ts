import React from 'react';

export function useInFlightLock() {
  const ref = React.useRef(false);
  return {
    lock: () => {
      if (ref.current) return false;
      ref.current = true;
      return true;
    },
    release: () => { ref.current = false; }
  };
}
