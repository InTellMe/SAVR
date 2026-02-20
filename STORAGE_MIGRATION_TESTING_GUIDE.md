# Storage Migration Testing Guide

This guide provides step-by-step instructions for testing the Firebase Storage → Supabase Storage migration.

## Prerequisites

Before testing, ensure:
1. Supabase project is configured with the migration applied
2. Storage buckets are created: `recipe-images`, `inventory-images`, `labeling-images`
3. Environment variables are set correctly (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)

## Testing Checklist

### Infrastructure Verification

- [ ] **Supabase Migration Applied**
  ```bash
  # Check if migration was applied successfully
  supabase migration list
  # Should show: 20260220000012_create_storage_buckets_and_policies.sql
  ```

- [ ] **Buckets Created**
  - Go to Supabase Dashboard → Storage
  - Verify three buckets exist:
    - ✅ recipe-images (public)
    - ✅ inventory-images (private)
    - ✅ labeling-images (private)

- [ ] **RLS Policies Applied**
  - Go to Supabase Dashboard → Storage → Policies
  - Verify policies exist for each bucket
  - Check that policies reference `auth.uid()`

### Web Application Testing

#### 1. Upload Page (Pantry/Receipt Scanning)

**Test Case: Upload Inventory Image**
1. Navigate to `/upload` page
2. Click "Pantry Scan" mode
3. Upload a photo of food items
4. Expected: Image uploads to `inventory-images` bucket
5. Verify: AI analyzes image and extracts ingredients
6. Save items to inventory
7. Check: Items appear in inventory with image

**Test Case: Upload Receipt**
1. Navigate to `/upload?mode=receipt`
2. Click "Receipt Scan" mode
3. Upload a receipt photo
4. Expected: Image uploads to `inventory-images` bucket
5. Verify: Receipt items are extracted with prices
6. Save items to inventory

**Test Case: QR Transfer**
1. Click "Generate QR Code" on upload page
2. Scan QR code with mobile device
3. Upload photo from mobile browser
4. Expected: Image uploads to `inventory-images` bucket
5. Verify: Photo appears in desktop transfer section
6. Click "Analyze" on transferred photo
7. Check: Ingredients are extracted

#### 2. Recipes Page

**Test Case: Import Recipe from Image**
1. Navigate to `/recipes` page
2. Click "Import Recipe" → "From Photo"
3. Upload an image of a recipe
4. Expected: Image uploads to `recipe-images` bucket
5. Verify: Recipe is extracted and displayed
6. Save recipe
7. Check: Recipe appears in list

#### 3. Labeling Page

**Test Case: Upload Dataset Image**
1. Navigate to `/labeling` page
2. Upload an image for AI labeling
3. Expected: Image uploads to `labeling-images` bucket
4. Verify: Image dimensions are captured
5. Check: AI auto-labeling starts (if enabled)
6. Verify: Annotations can be created

### Mobile Application Testing

#### 4. Inventory Screen

**Test Case: Camera Upload**
1. Open mobile app
2. Navigate to Inventory screen
3. Tap "Add Item"
4. Select "Take Photo"
5. Grant camera permission
6. Take photo of food item
7. Expected: Image uploads to `inventory-images` bucket
8. Verify: Item is saved with image
9. Check: Image displays in inventory list

**Test Case: Gallery Upload**
1. Navigate to Inventory screen
2. Tap "Add Item"
3. Select "Choose from Library"
4. Grant photo library permission
5. Select existing photo
6. Expected: Image uploads to `inventory-images` bucket
7. Verify: Item is saved correctly

#### 5. Labeling Screen (Mobile)

**Test Case: Mobile Dataset Upload**
1. Navigate to Labeling screen
2. Tap "Upload Image"
3. Take photo or select from gallery
4. Expected: Image uploads to `labeling-images` bucket
5. Verify: Image is ready for annotation

### Security Testing

#### 6. Row Level Security (RLS)

**Test Case: User Isolation**
1. Create User A and User B
2. User A uploads image to inventory
3. User B tries to access User A's image URL
4. Expected: User B receives 403 Forbidden or cannot see image
5. Verify: RLS policies are working

**Test Case: Recipe Images (Public Bucket)**
1. User A uploads recipe image
2. Get public URL of recipe image
3. Access URL without authentication
4. Expected: Image is viewable (public bucket)
5. User B (different user) accesses same URL
6. Expected: Image is viewable

**Test Case: Inventory Images (Private Bucket)**
1. User A uploads inventory image
2. Get the storage path
3. Try to access with User B's credentials
4. Expected: Access denied by RLS

#### 7. Backward Compatibility

**Test Case: Legacy Firebase URLs**
1. Find an existing item with Firebase Storage URL
2. Display the item in the UI
3. Expected: Image displays correctly (backward compatibility)
4. Upload new image for the same item
5. Expected: New image uses Supabase Storage
6. Check: Both old and new images display

### Error Handling Testing

#### 8. Network Errors

**Test Case: Upload Failure**
1. Disconnect from network
2. Try to upload image
3. Expected: User-friendly error message
4. Reconnect network
5. Retry upload
6. Expected: Upload succeeds

#### 9. Large Files

**Test Case: Large Image Upload**
1. Select a very large image (>10MB)
2. Attempt upload
3. Expected: Either succeeds or shows file size limit error
4. Check: No silent failures or crashes

#### 10. Invalid Files

**Test Case: Non-Image Upload**
1. Try to upload a PDF or text file (if possible)
2. Expected: Validation error or file type filter prevents it

### Performance Testing

#### 11. Multiple Uploads

**Test Case: Concurrent Uploads**
1. Upload 5 images simultaneously (if UI allows)
2. Expected: All uploads succeed
3. Verify: No conflicts in file naming (timestamp prevents this)
4. Check: All images are accessible

#### 12. Upload Progress

**Test Case: Progress Indication**
1. Upload a large image
2. Expected: Loading indicator or progress bar shows
3. Verify: User knows upload is in progress
4. Check: Cannot submit form while uploading

## Success Criteria

All tests should pass with:
- ✅ Images upload successfully to correct buckets
- ✅ RLS policies prevent unauthorized access
- ✅ Image URLs are generated correctly
- ✅ Backward compatibility with Firebase URLs works
- ✅ Error messages are user-friendly
- ✅ No console errors or warnings
- ✅ Mobile and web apps both work correctly

## Rollback Plan

If critical issues are found:

1. **Immediate**: Revert PR to restore Firebase Storage usage
2. **Database**: Old Firebase URLs in database remain functional
3. **Storage**: Supabase storage buckets can be retained or deleted
4. **Investigation**: Debug issues before re-attempting migration

## Post-Migration Monitoring

After successful testing and deployment:

1. **Monitor Error Rates**
   - Check application logs for upload failures
   - Monitor Supabase storage metrics

2. **Check User Reports**
   - Monitor support channels for image upload issues
   - Track any RLS access denied errors

3. **Verify Analytics**
   - Confirm upload success rates are similar to pre-migration
   - Check image display metrics

4. **Cost Monitoring**
   - Monitor Supabase storage usage and costs
   - Compare with previous Firebase Storage costs

## Debugging Tips

### Common Issues

**Issue: Images not uploading**
- Check: Supabase environment variables are set
- Check: Storage buckets exist in Supabase dashboard
- Check: User is authenticated
- Check: Network errors in browser console

**Issue: RLS access denied**
- Check: User is logged in
- Check: File path matches user ID
- Verify: RLS policies are applied correctly
- Check: auth.uid() returns correct value

**Issue: Images not displaying**
- Check: Public URLs are generated correctly
- Check: CORS is configured in Supabase
- Verify: Bucket is public (for recipe-images)
- For private buckets: Use signed URLs

**Issue: Backward compatibility failing**
- Check: isFirebaseStorageUrl() function logic
- Verify: Firebase URLs are still valid
- Check: Helper function is used consistently

## Manual SQL Verification

```sql
-- Check bucket configuration
SELECT * FROM storage.buckets;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'objects';

-- Check uploaded files
SELECT * FROM storage.objects WHERE bucket_id = 'recipe-images';
SELECT * FROM storage.objects WHERE bucket_id = 'inventory-images';
SELECT * FROM storage.objects WHERE bucket_id = 'labeling-images';

-- Verify file paths follow expected pattern
SELECT name, created_at FROM storage.objects 
WHERE bucket_id = 'inventory-images' 
ORDER BY created_at DESC 
LIMIT 10;
```

## Next Steps After Successful Testing

1. ✅ Mark PR as ready for merge
2. ✅ Deploy to staging environment
3. ✅ Run tests in staging
4. ✅ Deploy to production
5. ✅ Monitor for 24-48 hours
6. ✅ Consider migrating old Firebase images (optional, future work)
