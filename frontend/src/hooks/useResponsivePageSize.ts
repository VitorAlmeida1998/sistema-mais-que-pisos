import { useState, useEffect } from 'react'

function getSize() {
  if (window.innerWidth < 640) return 8
  if (window.innerWidth < 1024) return 15
  return 20
}

export function useResponsivePageSize() {
  const [size, setSize] = useState(getSize)
  useEffect(() => {
    function onResize() { setSize(getSize()) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return size
}
