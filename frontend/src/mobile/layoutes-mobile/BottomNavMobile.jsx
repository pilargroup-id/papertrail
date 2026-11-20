import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import ListSubheader from '@mui/material/ListSubheader'
import Paper from '@mui/material/Paper'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined'
import MenuIcon from '@mui/icons-material/Menu'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'

import {
  implementedNavigationPaths,
  primaryNavigationItems,
  secondaryNavigationItems,
} from '../../services/layoutes/Navigation.js'

const MENU_VALUE = 'menu'

const bottomNavIcons = {
  frp: <DescriptionOutlinedIcon />,
  rp: <PaymentsOutlinedIcon />,
  'rp-to-frp': <SwapHorizIcon />,
  logs: <ListAltOutlinedIcon />,
}

const bottomNavLabels = {
  'rp-to-frp': 'Convert',
}

const normalizePath = (path) => (path ?? '').toString().replace(/\/+$/, '').toLowerCase()
const normalizeRole = (role) => (role ?? '').toString().trim().toUpperCase()

function isItemVisible(item, userRole) {
  if (!item.allowedRoles?.length) return true
  return item.allowedRoles.some((role) => normalizeRole(role) === normalizeRole(userRole))
}

function hasActiveDescendant(item, currentPath) {
  return item.children?.some((child) =>
    child.children?.length
      ? hasActiveDescendant(child, currentPath)
      : normalizePath(child.href) === currentPath,
  ) ?? false
}

function BottomNavMobile({ activePath = '', userRole = '' }) {
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState({})
  const currentPath = normalizePath(activePath)

  const visibleItems = useMemo(
    () => primaryNavigationItems.filter((item) => isItemVisible(item, userRole)),
    [userRole],
  )
  const directItems = visibleItems.filter((item) => !item.children?.length)
  const groupItems = visibleItems.filter((item) => item.children?.length)

  const activeDirectItem = directItems.find((item) => normalizePath(item.href) === currentPath)
  const isMenuActive = groupItems.some((item) => hasActiveDescendant(item, currentPath))
  const value = activeDirectItem?.id ?? (isMenuActive ? MENU_VALUE : false)

  const goTo = (item) => {
    setIsMenuOpen(false)

    if (item.external && item.href) {
      window.location.assign(item.href)
      return
    }

    if (!item.href || !implementedNavigationPaths.includes(item.href)) return
    if (normalizePath(item.href) !== currentPath) navigate(item.href)
  }

  const handleChange = (_event, nextValue) => {
    if (nextValue === MENU_VALUE) {
      setIsMenuOpen(true)
      return
    }

    const item = directItems.find((directItem) => directItem.id === nextValue)
    if (item) goTo(item)
  }

  const toggleGroup = (id) => {
    setExpandedGroups((current) => ({ ...current, [id]: !(current[id] ?? false) }))
  }

  const renderMenuItems = (items, depth = 0) =>
    items.map((item) => {
      const hasChildren = item.children?.length > 0
      const isActive = hasChildren
        ? hasActiveDescendant(item, currentPath)
        : normalizePath(item.href) === currentPath
      const isExpanded = expandedGroups[item.id] ?? isActive
      const Icon = item.icon

      return (
        <div key={item.id}>
          <ListItemButton
            selected={!hasChildren && isActive}
            onClick={() => (hasChildren ? toggleGroup(item.id) : goTo(item))}
            sx={{ pl: 2 + depth * 2 }}
          >
            {Icon ? (
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Icon size={20} />
              </ListItemIcon>
            ) : null}
            <ListItemText
              primary={item.label}
              inset={!Icon && depth > 0}
              slotProps={{ primary: { fontWeight: isActive ? 600 : 400 } }}
            />
            {hasChildren ? isExpanded ? <ExpandLess /> : <ExpandMore /> : null}
          </ListItemButton>

          {hasChildren ? (
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <List disablePadding>{renderMenuItems(item.children, depth + 1)}</List>
            </Collapse>
          ) : null}
        </div>
      )
    })

  return (
    <>
      <Paper
        component="nav"
        aria-label="Mobile navigation"
        elevation={8}
        sx={{
          flexShrink: 0,
          zIndex: 20,
          borderRadius: 0,
          pb: 'env(safe-area-inset-bottom)',
        }}
      >
        <BottomNavigation showLabels value={value} onChange={handleChange}>
          {directItems.map((item) => (
            <BottomNavigationAction
              key={item.id}
              value={item.id}
              label={bottomNavLabels[item.id] ?? item.label}
              icon={bottomNavIcons[item.id] ?? <DescriptionOutlinedIcon />}
            />
          ))}
          <BottomNavigationAction value={MENU_VALUE} label="Menu" icon={<MenuIcon />} />
        </BottomNavigation>
      </Paper>

      <Drawer
        anchor="bottom"
        open={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: '80dvh',
              pb: 'env(safe-area-inset-bottom)',
            },
          },
        }}
      >
        <List subheader={<ListSubheader>Menu</ListSubheader>}>
          {renderMenuItems(groupItems)}
        </List>
        <Divider />
        <List>{renderMenuItems(secondaryNavigationItems)}</List>
      </Drawer>
    </>
  )
}

export default BottomNavMobile
