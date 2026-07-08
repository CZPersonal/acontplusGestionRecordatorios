export default function NavItem({ icon, label, isActive, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-3 p-2 md:p-3 rounded-lg transition-colors w-full ${
        isActive ? 'md:bg-pink-50' : 'text-slate-500 hover:bg-slate-100'
      }`}
      style={isActive ? { color: '#D61672' } : {}}
    >
      <div className={`relative ${isActive ? 'scale-110' : ''} transition-transform`}>
        {icon}
        {!!badge && (
          <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className="text-[10px] md:text-sm font-medium">{label}</span>
    </button>
  );
}
