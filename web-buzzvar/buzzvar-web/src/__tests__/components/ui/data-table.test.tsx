import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DataTable, createSortableHeader, createActionColumn } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'

// Mock data
const mockData = [
  { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'active' },
]

const mockColumns: ColumnDef<typeof mockData[0]>[] = [
  {
    accessorKey: 'name',
    header: createSortableHeader('Name'),
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
]

describe('DataTable', () => {
  it('renders table with data', () => {
    render(<DataTable columns={mockColumns} data={mockData} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getAllByText('active')).toHaveLength(2) // Two users have 'active' status
  })

  it('shows search input when searchKey is provided', () => {
    render(
      <DataTable 
        columns={mockColumns} 
        data={mockData} 
        searchKey="name"
        searchPlaceholder="Search users..."
      />
    )
    
    expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument()
  })

  it('filters data when searching', async () => {
    render(
      <DataTable 
        columns={mockColumns} 
        data={mockData} 
        searchKey="name"
      />
    )
    
    const searchInput = screen.getByPlaceholderText('Search...')
    fireEvent.change(searchInput, { target: { value: 'John' } })
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    })
  })

  it('shows column visibility toggle', () => {
    render(<DataTable columns={mockColumns} data={mockData} />)
    
    expect(screen.getByText('Columns')).toBeInTheDocument()
  })

  it('shows pagination controls', () => {
    render(<DataTable columns={mockColumns} data={mockData} />)
    
    expect(screen.getByText('Previous')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
  })

  it('handles row click when onRowClick is provided', () => {
    const onRowClick = vi.fn()
    render(
      <DataTable 
        columns={mockColumns} 
        data={mockData} 
        onRowClick={onRowClick}
      />
    )
    
    const firstRow = screen.getByText('John Doe').closest('tr')
    fireEvent.click(firstRow!)
    
    expect(onRowClick).toHaveBeenCalledWith(mockData[0])
  })

  it('shows selection checkboxes when enableRowSelection is true', () => {
    render(
      <DataTable 
        columns={mockColumns} 
        data={mockData} 
        enableRowSelection={true}
      />
    )
    
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThan(0)
  })

  it('calls onSelectionChange when rows are selected', async () => {
    const onSelectionChange = vi.fn()
    render(
      <DataTable 
        columns={mockColumns} 
        data={mockData} 
        enableRowSelection={true}
        onSelectionChange={onSelectionChange}
      />
    )
    
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1]) // Click first data row checkbox
    
    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalled()
    })
  })

  it('shows "No results" when data is empty', () => {
    render(<DataTable columns={mockColumns} data={[]} />)
    
    expect(screen.getByText('No results.')).toBeInTheDocument()
  })
})

describe('createSortableHeader', () => {
  it('creates sortable header component', () => {
    const SortableHeader = createSortableHeader('Test Header')
    const mockColumn = {
      toggleSorting: vi.fn(),
      getIsSorted: vi.fn().mockReturnValue(false),
    }
    
    render(<SortableHeader column={mockColumn} />)
    
    expect(screen.getByText('Test Header')).toBeInTheDocument()
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(mockColumn.toggleSorting).toHaveBeenCalled()
  })
})

describe('createActionColumn', () => {
  it('creates action column with dropdown menu', () => {
    const actions = [
      { label: 'Edit', onClick: vi.fn() },
      { label: 'Delete', onClick: vi.fn(), variant: 'destructive' as const },
    ]
    
    const actionColumn = createActionColumn(actions)
    const mockRow = { original: mockData[0] }
    
    const ActionCell = actionColumn.cell as any
    render(<ActionCell row={mockRow} />)
    
    // Check that the menu button is rendered
    const menuButton = screen.getByRole('button')
    expect(menuButton).toBeInTheDocument()
    
    // Check that the button has the correct attributes for a dropdown menu
    expect(menuButton).toHaveAttribute('aria-haspopup', 'menu')
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
  })
})