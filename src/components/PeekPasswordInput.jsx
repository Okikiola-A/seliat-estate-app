import { forwardRef } from 'react'

const PeekPasswordInput = forwardRef(({
  value,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  placeholder,
  style,
  autoComplete,
  showPassword,
}, ref) => {
  return (
    <input
      ref={ref}
      type={showPassword ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      autoComplete={autoComplete || 'off'}
      placeholder={placeholder}
      style={style}
    />
  )
})

PeekPasswordInput.displayName = 'PeekPasswordInput'
export default PeekPasswordInput