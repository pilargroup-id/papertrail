import {
  LogOutLeft01,
  Table01,
  Chart01,
  Folder,
  TrendingUp,
  MoreHorizontal,
  Users01,
  Settings01,
  Banks,
  CreditCard,
  UserBank,
  Budgets,
  BudgetType,
  BudgetAccess,
} from '../../components/layoute/TemplateIcons.jsx'

export const defaultNavigationPath = '/forms'

export const implementedNavigationPaths = [
  '/icons',
  '/forms',
  '/Master',

  // VENDOR MANAGEMENT
  '/Master/Vendor',
  '/Master/Banks',
  '/Master/VendorBanksAccount',
  
  // BUDGET MANAGEMENT
  '/Master/Budgets',
  '/Master/Budget-type',
  '/Master/Budget-access',

  // DOCUMENT MANAGEMENT
  '/Master/Frp-docs-type',

  '/Page1',
  '/Page2',
  '/Page3',
  '/Table',
  '/TableActions',
  '/users',
  '/Chart',
]

export const primaryNavigationItems = [
  {
    id: 'icons',
    label: 'Icons',
    href: '/icons',
    icon: MoreHorizontal,
  },
  {
    id: 'forms',
    label: 'Forms',
    href: '/forms',
    icon: Users01,
  },
  {
    id: 'master',
    label: 'Master',
    href: '/Master',
    icon: Settings01,
    children: [
      {
        id: 'vendor-management',
        label: 'Vendor',
        icon: Users01,
        children: [
          {
            id: 'vendor',
            label: 'Vendor',
            href: '/Master/Vendor',
            icon: Users01,
          },
          {
            id: 'vendor-bank',
            label: 'Banks',
            href: '/Master/Banks',
            icon: Banks,
          },
          {
            id: 'vendor-banks-account',
            label: 'Vendor Banks',
            href: '/Master/VendorBanksAccount',
            icon: UserBank,
          },
        ],
      },
      {
        id: 'budget-management',
        label: 'Budgets',
        icon: Budgets,
        children: [
          {
            id: 'budgets',
            label: 'Budgets',
            href: '/Master/Budgets',
            icon: Budgets,
          },
          {
            id: 'budget-type',
            label: 'Budget Type',
            href: '/Master/Budget-type',
            icon: BudgetType,
          },
          {
            id: 'budget-access',
            label: 'Budget Access',
            href: '/Master/Budget-access',
            icon: BudgetAccess,
          }
        ]
      },
      {
        id: 'document',
        label: 'Document',
        icon: Folder,
        children: [
          {
            id: 'frp-docs-type',
            label: 'Frp Docs Type',
            href: 'Master/Frp-docs-type',
            icon: Folder,
          },
        ]
      }
    ],
  },
  {
    id: 'table',
    label: 'Table',
    icon: Table01,
    icon: Folder,
    children: [
      {
        id: 'page1',
        label: 'Data Table',
        href: '/Page1',
        icon: Table01,
      },
      {
        id: 'page2',
        label: 'Data Table Actions',
        href: '/Page2',
        icon: Table01,
      },
      {
        id: 'page3',
        label: 'Data Table Accordion',
        href: '/Page3',
        icon: Table01,
      },
    ],
  },
  {
    id: 'chart',
    label: 'Chart',
    href: '/Chart',
    icon: Chart01,
  }
]

export const secondaryNavigationItems = [
  {
    id: 'back-pilargroup',
    label: 'Back Pilargroup',
    href: 'https://pilargroup.id/dashboard',
    icon: LogOutLeft01,
    external: true,
  },
]
