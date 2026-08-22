export function BrandMark({ compact = false }) {
  return (
    <div className={`flex items-center gap-3.5 ${compact ? '' : ''}`}>
      {/* Gold monogram box */}
      <div className="relative flex items-center justify-center" style={{ width: 44, height: 44, border: '1px solid #3c3324', background: '#0b0b0b', flexShrink: 0 }}>
        {/* Corner accents */}
        <div style={{ position: 'absolute', top: 3, left: 3, width: 7, height: 7, borderTop: '1px solid #c9963e', borderLeft: '1px solid #c9963e' }} />
        <div style={{ position: 'absolute', top: 3, right: 3, width: 7, height: 7, borderTop: '1px solid #c9963e', borderRight: '1px solid #c9963e' }} />
        <div style={{ position: 'absolute', bottom: 3, left: 3, width: 7, height: 7, borderBottom: '1px solid #c9963e', borderLeft: '1px solid #c9963e' }} />
        <div style={{ position: 'absolute', bottom: 3, right: 3, width: 7, height: 7, borderBottom: '1px solid #c9963e', borderRight: '1px solid #c9963e' }} />
        <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 700, color: '#d8b46a', letterSpacing: '-0.02em', lineHeight: 1 }}>FH</span>
      </div>
      {!compact && (
        <div className="leading-none">
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', color: '#f0ebe2', textTransform: 'uppercase', lineHeight: 1 }}>Fashion Hub</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 8.5, fontWeight: 500, letterSpacing: '0.22em', color: '#c9963e', textTransform: 'uppercase', marginTop: 5, lineHeight: 1 }}>Premium Menswear</p>
        </div>
      )}
    </div>
  );
}
