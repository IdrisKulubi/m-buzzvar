import { CloudflareR2Service } from '../src/lib/storage/cloudflare-r2-service'
import { FileUploadService } from '../src/lib/services/file-upload-service'
import { createReadStream, readFileSync } from 'fs'
import { join } from 'path'

interface TestResult {
  testName: string
  success: boolean
  error?: string
  details?: any
}

class R2IntegrationTester {
  private r2Service: CloudflareR2Service
  private testResults: TestResult[] = []

  constructor() {
    try {
      this.r2Service = new CloudflareR2Service()
    } catch (error) {
      console.error('❌ Failed to initialize R2 service:', error)
      process.exit(1)
    }
  }

  /**
   * Run all integration tests
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Cloudflare R2 Integration Tests...\n')

    // Test basic R2 operations
    await this.testUploadFile()
    await this.testGetPublicUrl()
    await this.testSignedUrls()
    await this.testDeleteFile()

    // Test file validation
    await this.testFileValidation()

    // Test error handling
    await this.testErrorHandling()

    // Print results
    this.printResults()
  }

  /**
   * Test file upload functionality
   */
  private async testUploadFile(): Promise<void> {
    const testName = 'File Upload'
    console.log(`🔄 Testing ${testName}...`)

    try {
      // Create a test file buffer
      const testContent = 'This is a test file for R2 integration testing'
      const buffer = Buffer.from(testContent)
      const key = `test/integration-test-${Date.now()}.txt`

      const result = await this.r2Service.uploadFile(
        buffer,
        key,
        'text/plain',
        { testFile: 'true', uploadedAt: new Date().toISOString() }
      )

      if (result.success && result.url) {
        this.testResults.push({
          testName,
          success: true,
          details: { url: result.url, key: result.key },
        })
        console.log(`✅ ${testName} passed`)
        
        // Store key for cleanup
        this.storeTestKey(key)
      } else {
        throw new Error(result.error || 'Upload failed without error message')
      }
    } catch (error) {
      this.testResults.push({
        testName,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      console.log(`❌ ${testName} failed:`, error)
    }
  }

  /**
   * Test public URL generation
   */
  private async testGetPublicUrl(): Promise<void> {
    const testName = 'Public URL Generation'
    console.log(`🔄 Testing ${testName}...`)

    try {
      const key = 'test/sample-file.txt'
      const publicUrl = this.r2Service.getPublicUrl(key)

      if (publicUrl && publicUrl.includes(key)) {
        this.testResults.push({
          testName,
          success: true,
          details: { publicUrl },
        })
        console.log(`✅ ${testName} passed`)
      } else {
        throw new Error('Invalid public URL generated')
      }
    } catch (error) {
      this.testResults.push({
        testName,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      console.log(`❌ ${testName} failed:`, error)
    }
  }

  /**
   * Test signed URL generation
   */
  private async testSignedUrls(): Promise<void> {
    const testName = 'Signed URL Generation'
    console.log(`🔄 Testing ${testName}...`)

    try {
      const key = `test/signed-url-test-${Date.now()}.txt`
      
      // Test upload signed URL
      const uploadUrl = await this.r2Service.getSignedUploadUrl(key, 'text/plain')
      
      if (!uploadUrl || !uploadUrl.startsWith('https://')) {
        throw new Error('Invalid upload signed URL')
      }

      // Test download signed URL
      const downloadUrl = await this.r2Service.getSignedDownloadUrl(key)
      
      if (!downloadUrl || !downloadUrl.startsWith('https://')) {
        throw new Error('Invalid download signed URL')
      }

      this.testResults.push({
        testName,
        success: true,
        details: { uploadUrl: uploadUrl.substring(0, 50) + '...', downloadUrl: downloadUrl.substring(0, 50) + '...' },
      })
      console.log(`✅ ${testName} passed`)
    } catch (error) {
      this.testResults.push({
        testName,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      console.log(`❌ ${testName} failed:`, error)
    }
  }

  /**
   * Test file deletion
   */
  private async testDeleteFile(): Promise<void> {
    const testName = 'File Deletion'
    console.log(`🔄 Testing ${testName}...`)

    try {
      // First upload a file to delete
      const testContent = 'File to be deleted'
      const buffer = Buffer.from(testContent)
      const key = `test/delete-test-${Date.now()}.txt`

      const uploadResult = await this.r2Service.uploadFile(buffer, key, 'text/plain')
      
      if (!uploadResult.success) {
        throw new Error('Failed to upload file for deletion test')
      }

      // Now delete it
      const deleteResult = await this.r2Service.deleteFile(key)

      if (deleteResult.success) {
        this.testResults.push({
          testName,
          success: true,
          details: { deletedKey: key },
        })
        console.log(`✅ ${testName} passed`)
      } else {
        throw new Error(deleteResult.error || 'Deletion failed without error message')
      }
    } catch (error) {
      this.testResults.push({
        testName,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      console.log(`❌ ${testName} failed:`, error)
    }
  }

  /**
   * Test file validation
   */
  private async testFileValidation(): Promise<void> {
    const testName = 'File Validation'
    console.log(`🔄 Testing ${testName}...`)

    try {
      // Test valid file
      const validFile = { size: 1024 * 1024, type: 'image/jpeg' } // 1MB JPEG
      const validResult = CloudflareR2Service.validateFile(validFile)
      
      if (!validResult.isValid) {
        throw new Error('Valid file was rejected')
      }

      // Test invalid file type
      const invalidTypeFile = { size: 1024, type: 'application/exe' }
      const invalidTypeResult = CloudflareR2Service.validateFile(invalidTypeFile)
      
      if (invalidTypeResult.isValid) {
        throw new Error('Invalid file type was accepted')
      }

      // Test oversized file
      const oversizedFile = { size: 50 * 1024 * 1024, type: 'image/jpeg' } // 50MB
      const oversizedResult = CloudflareR2Service.validateFile(oversizedFile, ['image/jpeg'], 10)
      
      if (oversizedResult.isValid) {
        throw new Error('Oversized file was accepted')
      }

      this.testResults.push({
        testName,
        success: true,
        details: { validationTests: 3 },
      })
      console.log(`✅ ${testName} passed`)
    } catch (error) {
      this.testResults.push({
        testName,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      console.log(`❌ ${testName} failed:`, error)
    }
  }

  /**
   * Test error handling
   */
  private async testErrorHandling(): Promise<void> {
    const testName = 'Error Handling'
    console.log(`🔄 Testing ${testName}...`)

    try {
      // Test URL extraction with invalid URL
      const invalidKey = CloudflareR2Service.extractKeyFromUrl('not-a-url')
      if (invalidKey !== null) {
        throw new Error('Invalid URL should return null')
      }

      // Test file key generation
      const key = CloudflareR2Service.generateFileKey('user123', 'test.jpg', 'prefix')
      if (!key.includes('prefix/user123/') || !key.endsWith('.jpg')) {
        throw new Error('File key generation failed')
      }

      this.testResults.push({
        testName,
        success: true,
        details: { errorHandlingTests: 2 },
      })
      console.log(`✅ ${testName} passed`)
    } catch (error) {
      this.testResults.push({
        testName,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      console.log(`❌ ${testName} failed:`, error)
    }
  }

  /**
   * Store test keys for cleanup
   */
  private storeTestKey(key: string): void {
    // In a real implementation, you might store these in a file or database
    // For now, we'll just log them
    console.log(`📝 Test file created: ${key}`)
  }

  /**
   * Print test results summary
   */
  private printResults(): void {
    console.log('\n📊 Test Results Summary:')
    console.log('=' .repeat(50))

    const passed = this.testResults.filter(r => r.success).length
    const failed = this.testResults.filter(r => !r.success).length

    this.testResults.forEach(result => {
      const status = result.success ? '✅ PASS' : '❌ FAIL'
      console.log(`${status} ${result.testName}`)
      
      if (result.error) {
        console.log(`   Error: ${result.error}`)
      }
      
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`)
      }
    })

    console.log('=' .repeat(50))
    console.log(`Total Tests: ${this.testResults.length}`)
    console.log(`Passed: ${passed}`)
    console.log(`Failed: ${failed}`)
    console.log(`Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`)

    if (failed === 0) {
      console.log('\n🎉 All tests passed! R2 integration is working correctly.')
    } else {
      console.log('\n⚠️  Some tests failed. Please check the configuration and try again.')
    }
  }
}

// CLI execution
async function main() {
  const tester = new R2IntegrationTester()
  
  try {
    await tester.runAllTests()
    process.exit(0)
  } catch (error) {
    console.error('💥 Integration test failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { R2IntegrationTester }