import React, { useEffect, useRef, useState } from "react";

export default function VirtualImage({
  src,
  alt,
  force = false,
  wrapperClassName = "",
  wrapperStyle = {},
  imgClassName = "",
  imgStyle = {},
}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Preload image for smooth appearance
  useEffect(() => {
    let active = true;
    const img = new Image();
    img.src = src;
    const handleLoad = () => { if (active) setLoaded(true); };
    img.onload = handleLoad;
    img.onerror = handleLoad;
    if (img.decode) {
      img.decode().then(handleLoad).catch(handleLoad);
    }
    return () => { active = false; };
  }, [src]);

  useEffect(() => {
    if (force) { setInView(true); return; }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "200px" });
    const el = ref.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [force]);

  return (
    <div ref={ref} className={wrapperClassName} style={wrapperStyle}>
      {(force || (inView && loaded)) && (
        <img src={src} alt={alt} className={imgClassName} style={imgStyle} draggable={false} />
      )}
    </div>
  );
}
