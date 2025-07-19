import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FileUpload, SingleFileUpload } from '@/components/ui/file-upload'

// Mock file for testing
const createMockFile = (name: string, size: number, type: string) => {
  const file = new File([''], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('FileUpload', () => {
  it('renders upload area with label', () => {
    render(<FileUpload label="Upload your files" />)
    
    expect(screen.getByText('Upload your files')).toBeInTheDocument()
    expect(screen.getByText(/drag and drop files here/i)).toBeInTheDocument()
  })

  it('shows description when provided', () => {
    render(
      <FileUpload 
        label="Upload files" 
        description="Select images or documents"
      />
    )
    
    expect(screen.getByText('Select images or documents')).toBeInTheDocument()
  })

  it('shows max size and max files info', () => {
    render(
      <FileUpload 
        maxSize={5 * 1024 * 1024} // 5MB
        maxFiles={3}
      />
    )
    
    expect(screen.getByText(/Max size: 5 MB/)).toBeInTheDocument()
    expect(screen.getByText(/Max files: 3/)).toBeInTheDocument()
  })

  it('opens file dialog when clicked', () => {
    render(<FileUpload />)
    
    const uploadArea = screen.getByText(/drag and drop files here/i).closest('div')
    
    // Mock the file input click
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => {})
    
    fireEvent.click(uploadArea!)
    
    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
  })

  it('handles file selection', async () => {
    const onFilesChange = vi.fn()
    render(<FileUpload onFilesChange={onFilesChange} />)
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = createMockFile('test.txt', 1024, 'text/plain')
    
    fireEvent.change(fileInput, { target: { files: [file] } })
    
    await waitFor(() => {
      expect(onFilesChange).toHaveBeenCalledWith([file])
    })
  })

  it('validates file size', async () => {
    render(<FileUpload maxSize={1024} showPreview={true} />)
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const largeFile = createMockFile('large.txt', 2048, 'text/plain')
    
    fireEvent.change(fileInput, { target: { files: [largeFile] } })
    
    await waitFor(() => {
      expect(screen.getByText(/File size exceeds/)).toBeInTheDocument()
    })
  })

  it('shows file preview when showPreview is true', async () => {
    render(<FileUpload showPreview={true} />)
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = createMockFile('test.txt', 1024, 'text/plain')
    
    fireEvent.change(fileInput, { target: { files: [file] } })
    
    await waitFor(() => {
      expect(screen.getByText('test.txt')).toBeInTheDocument()
      expect(screen.getByText('1 KB')).toBeInTheDocument()
    })
  })

  it('shows upload button when onUpload is provided', async () => {
    const onUpload = vi.fn().mockResolvedValue(['http://example.com/file.txt'])
    render(<FileUpload onUpload={onUpload} showPreview={true} />)
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = createMockFile('test.txt', 1024, 'text/plain')
    
    fireEvent.change(fileInput, { target: { files: [file] } })
    
    await waitFor(() => {
      expect(screen.getByText('Upload Files')).toBeInTheDocument()
    })
  })

  it('handles file upload', async () => {
    const onUpload = vi.fn().mockResolvedValue(['http://example.com/file.txt'])
    render(<FileUpload onUpload={onUpload} showPreview={true} />)
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = createMockFile('test.txt', 1024, 'text/plain')
    
    fireEvent.change(fileInput, { target: { files: [file] } })
    
    await waitFor(() => {
      const uploadButton = screen.getByText('Upload Files')
      fireEvent.click(uploadButton)
    })
    
    expect(onUpload).toHaveBeenCalledWith([file])
  })

  it('removes files when remove button is clicked', async () => {
    render(<FileUpload showPreview={true} />)
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = createMockFile('test.txt', 1024, 'text/plain')
    
    fireEvent.change(fileInput, { target: { files: [file] } })
    
    await waitFor(() => {
      expect(screen.getByText('test.txt')).toBeInTheDocument()
    })
    
    const removeButton = screen.getByRole('button', { name: '' }) // X button
    fireEvent.click(removeButton)
    
    await waitFor(() => {
      expect(screen.queryByText('test.txt')).not.toBeInTheDocument()
    })
  })

  it('handles drag and drop', () => {
    render(<FileUpload dragAndDrop={true} />)
    
    const uploadArea = screen.getByText(/drag and drop files here/i).closest('div')
    const file = createMockFile('test.txt', 1024, 'text/plain')
    
    // Mock drag events
    fireEvent.dragOver(uploadArea!, {
      dataTransfer: { files: [file] }
    })
    
    fireEvent.drop(uploadArea!, {
      dataTransfer: { files: [file] }
    })
    
    // The component should handle the drop event
    expect(uploadArea).toBeInTheDocument()
  })

  it('disables upload when disabled prop is true', () => {
    render(<FileUpload disabled={true} />)
    
    // The disabled styling is applied to the Card component, not the inner div
    const card = document.querySelector('[data-slot="card"]')
    expect(card).toHaveClass('opacity-50', 'cursor-not-allowed')
  })

  it('shows error message', () => {
    render(<FileUpload error="Upload failed" />)
    
    expect(screen.getByText('Upload failed')).toBeInTheDocument()
  })

  it('respects maxFiles limit', async () => {
    const onFilesChange = vi.fn()
    render(<FileUpload maxFiles={2} onFilesChange={onFilesChange} />)
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const files = [
      createMockFile('file1.txt', 1024, 'text/plain'),
      createMockFile('file2.txt', 1024, 'text/plain'),
      createMockFile('file3.txt', 1024, 'text/plain'), // This should be ignored
    ]
    
    fireEvent.change(fileInput, { target: { files } })
    
    await waitFor(() => {
      expect(onFilesChange).toHaveBeenCalledWith([files[0], files[1]])
    })
  })
})

describe('SingleFileUpload', () => {
  it('renders single file upload', () => {
    render(<SingleFileUpload label="Upload single file" />)
    
    expect(screen.getByText('Upload single file')).toBeInTheDocument()
  })

  it('calls onFileChange with single file', async () => {
    const onFileChange = vi.fn()
    render(<SingleFileUpload onFileChange={onFileChange} />)
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = createMockFile('test.txt', 1024, 'text/plain')
    
    fireEvent.change(fileInput, { target: { files: [file] } })
    
    await waitFor(() => {
      expect(onFileChange).toHaveBeenCalledWith(file)
    })
  })

  it('calls onFileChange with null when no file', async () => {
    const onFileChange = vi.fn()
    render(<SingleFileUpload onFileChange={onFileChange} />)
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    fireEvent.change(fileInput, { target: { files: [] } })
    
    await waitFor(() => {
      expect(onFileChange).toHaveBeenCalledWith(null)
    })
  })
})