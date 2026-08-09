import { useNavigate, useLocation } from 'react-router-dom'

// For screens with lateral tabs (sidebar/bottom-nav style — Admin's tabs are
// the original case). Tracks how many tab-to-tab hops deep the current
// history entry is from that section's home tab, so jumping back to home
// can collapse the whole stack in one go instead of pushing yet another
// entry on top of it.
//
// Why this matters: without it, visiting Tab A -> Tab B -> Tab C -> Home
// leaves 4 stacked history entries, so a single back gesture from Home
// lands you on Tab C instead of exiting. With it, jumping to Home pops
// straight back to the section's original base entry, so one back gesture
// from Home always exits — no matter how many other tabs were visited
// first, and even if some of that path was real back/forward navigation
// rather than tab clicks (each history entry remembers its own depth via
// navigate()'s `state` option, not shared component state).
//
// Usage (mirrors AdminDashboard's sidebar):
//   const { goToTab } = useTabDepth()
//   goToTab('/admin')                          // home tab -> collapses stack
//   goToTab('/admin/users', { isHome: false })  // any other tab -> normal push
export function useTabDepth() {
  const navigate = useNavigate()
  const location = useLocation()
  const depth = location.state?.tabDepth || 0

  const goToTab = (path, { isHome = false } = {}) => {
    if (isHome) {
      if (depth > 0) navigate(-depth)
      return
    }
    navigate(path, { state: { tabDepth: depth + 1 } })
  }

  return { depth, goToTab }
}