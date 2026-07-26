import {
  LogOutLeft01,
  Users01,
  Settings01,
  Banks,
  UserBank,
  Budgets,
  BudgetType,
  BudgetAccess,
  Permission,
  FileText01,
} from '../../components/layoute/TemplateIcons.jsx'

export const defaultNavigationPath = '/forms'

export const implementedNavigationPaths = [
  // '/forms',
  '/Master',
  '/frp',
  '/rp',
  '/Rp',

  // VENDOR MANAGEMENT
  '/Master/Vendor',
  '/Master/Banks',
  '/Master/VendorBanksAccount',
  
  // BUDGET MANAGEMENT
  '/Master/Budgets',
  '/Master/Budget-type',
  '/Master/Budget-access',
  '/Master/Currencies',

  // DOCUMENT MANAGEMENT
  '/Master/Frp-docs-type',
  '/Master/External-document-types',
  '/Master/Payment-methods',

  // SETTINGS
  // '/Master/Rp-destination-departments',
  // '/Master/Rp-checker-rules',
  '/Master/Rp-payment-categories',

  // PERMISSION
  '/Master/permission-modules',

]

export const primaryNavigationItems = [
  // {
  //   id: 'forms',
  //   label: 'Forms',
  //   href: '/forms',
  //   icon: Users01,
  // },
  {
    id: 'frp',
    label: 'Forms Req Payment',
    href: '/frp',
    icon: FileText01,
  },
  {
    id: 'rp',
    label: 'Req Payment',
    href: '/Rp',
    icon: FileText01,
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
            // icon: Users01,
          },
          {
            id: 'vendor-bank',
            label: 'Banks',
            href: '/Master/Banks',
            // icon: Banks,
          },
          {
            id: 'vendor-banks-account',
            label: 'Vendor Banks',
            href: '/Master/VendorBanksAccount',
            // icon: UserBank,
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
            // icon: Budgets,
          },
          {
            id: 'budget-type',
            label: 'Budget Type',
            href: '/Master/Budget-type',
            // icon: BudgetType,
          },
          {
            id: 'budget-access',
            label: 'Budget Access',
            href: '/Master/Budget-access',
            // icon: BudgetAccess,
          },
          {
            id: 'currencies',
            label: 'Currencies',
            href: '/Master/Currencies'
          }
        ]
      }
    ],
  },
    {
    id: 'config-frp',
    label: 'Config',
    href: '/Master',
    icon: Settings01,
    children: [
      {
        id: 'frp-docs-type',
        label: 'Doc Types (FRP)',
        href: '/Master/Frp-docs-type',
      },
      {
        id: 'external-document-types',
        label: 'Doc Types (Ext)',
        href: '/Master/External-document-types',
      },
      {
        id: 'payment-methods',
        label: 'Payment Methods',
        href: '/Master/Payment-methods',
 
      },
      {
        id: 'rp-payment-categories',
        label: 'Categories Payment (Rp)',
        href: '/Master/Rp-payment-categories',
      }
    ]
  },
  {
    id: 'permission',
    label: 'Permission',
    href: '/Master',
    icon: Permission,
    children: [
      {
        id: 'permission-modules',
        label: 'Modules',
        href: '/Master/permission-modules',
      }
    ]
  },
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
