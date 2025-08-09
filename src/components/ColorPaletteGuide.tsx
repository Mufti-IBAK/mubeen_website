export const ColorPaletteGuide = () => {
    const colors = [
      { name: 'brand-dark', hex: '#1a202c' },
      { name: 'brand-light', hex: '#f7fafc' },
      { name: 'brand-primary', hex: '#4299e1' },
      { name: 'brand-accent', hex: '#f56565' },
    ];
  
    return (
      <div className="absolute p-4 rounded-lg bottom-4 left-4 bg-white/10 backdrop-blur-sm">
        <h3 className="text-white font-heading">Color Palette</h3>
        <div className="flex gap-2 mt-2">
          {colors.map(color => (
            <div key={color.name}>
              <div className={`w-10 h-10 rounded-full bg-${color.name}`} />
              <p className="mt-1 text-xs text-center text-white/70">{color.name}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };