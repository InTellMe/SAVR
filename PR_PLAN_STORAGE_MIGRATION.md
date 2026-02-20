# PR Plan: Storage Migration (Firebase Storage → Supabase Storage)

## Overview
Migrate all file storage operations from Firebase Storage to Supabase Storage. This includes image uploads for recipes, inventory items, and ML labeling datasets.

## Scope

### Storage Buckets to Create

1. **recipe-images** (Public)
   - Purpose: Store recipe images uploaded by users
   - Access: Public read, authenticated write to own folder
   - Path structure: `{userId}/{timestamp}_{filename}`

2. **inventory-images** (Private)
   - Purpose: Store pantry/fridge item photos
   - Access: User can only access their own images
   - Path structure: `{userId}/{timestamp}_{filename}`

3. **labeling-images** (Private)
   - Purpose: Store ML training dataset images
   - Access: Authenticated users can read/write
   - Path structure: `{imageId}_{filename}`

### Web Application Changes

#### 1. Upload Component Updates
**Files to modify:**
- `web/app/upload/page.tsx` - Receipt/pantry image uploads
- `web/app/recipes/page.tsx` - Recipe image uploads
- `web/app/labeling/page.tsx` - Dataset image uploads

**Current Firebase Storage pattern:**
```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

// Upload
const storageRef = ref(storage, `inventory/${userId}/${file.name}`);
const snapshot = await uploadBytes(storageRef, file);
const downloadURL = await getDownloadURL(snapshot.ref);

// Store URL in Firestore
await db.collection('inventory').doc(userId).collection('items').add({
  imageUrl: downloadURL,
  // ... other fields
});
```

**New Supabase Storage pattern:**
```typescript
import { supabase } from '@/lib/supabase';

// Upload
const fileName = `${Date.now()}_${file.name}`;
const filePath = `${userId}/${fileName}`;

const { data, error } = await supabase.storage
  .from('inventory-images')
  .upload(filePath, file, {
    cacheControl: '3600',
    upsert: false
  });

if (error) throw error;

// Get public URL (for public buckets) or signed URL (for private buckets)
const { data: { publicUrl } } = supabase.storage
  .from('inventory-images')
  .getPublicUrl(filePath);

// For private buckets, use signed URLs
const { data: signedData, error: signedError } = await supabase.storage
  .from('inventory-images')
  .createSignedUrl(filePath, 3600); // 1 hour expiry

// Store URL in database
await supabase
  .from('inventory')
  .insert({
    user_id: userId,
    image_url: filePath, // Store path, not full URL
    // ... other fields
  });
```

#### 2. Image Display Updates
**Files to modify:**
- All components that display images from storage

**Current pattern:**
```typescript
// Image URL is directly usable
<img src={item.imageUrl} alt={item.name} />
```

**New pattern:**
```typescript
// For public buckets
const imageUrl = supabase.storage
  .from('recipe-images')
  .getPublicUrl(item.image_url).data.publicUrl;

<img src={imageUrl} alt={item.name} />

// For private buckets (use signed URLs)
const [imageUrl, setImageUrl] = useState<string>('');

useEffect(() => {
  async function getSignedUrl() {
    const { data } = await supabase.storage
      .from('inventory-images')
      .createSignedUrl(item.image_url, 3600);
    if (data) setImageUrl(data.signedUrl);
  }
  getSignedUrl();
}, [item.image_url]);

<img src={imageUrl} alt={item.name} />
```

#### 3. Image Deletion
**Pattern:**
```typescript
// Delete from storage
const { error } = await supabase.storage
  .from('inventory-images')
  .remove([filePath]);

if (error) throw error;

// Delete from database
await supabase
  .from('inventory')
  .delete()
  .eq('id', itemId);
```

### Mobile Application Changes

#### 1. Image Upload
**Files to modify:**
- `mobile/src/screens/main/InventoryScreen.tsx`
- `mobile/src/screens/main/RecipesScreen.tsx`
- `mobile/src/screens/main/LabelingScreen.tsx`
- `mobile/src/utils/imageUtils.ts`

**Mobile upload pattern:**
```typescript
import { supabase } from '../config/supabase';
import * as ImagePicker from 'expo-image-picker';

// Pick image
const result = await ImagePicker.launchCameraAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 0.8,
});

if (!result.canceled) {
  const uri = result.assets[0].uri;
  
  // Convert to blob for upload
  const response = await fetch(uri);
  const blob = await response.blob();
  
  const fileName = `${Date.now()}_${result.assets[0].fileName || 'image.jpg'}`;
  const filePath = `${userId}/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('inventory-images')
    .upload(filePath, blob, {
      contentType: 'image/jpeg',
    });
  
  if (error) throw error;
  
  // Save to database with path
  await supabase.from('inventory').insert({
    user_id: userId,
    image_url: filePath,
    // ... other fields
  });
}
```

### Storage Utility Functions

**Create `web/lib/storage.ts`:**
```typescript
import { supabase } from './supabase';

export type BucketName = 'recipe-images' | 'inventory-images' | 'labeling-images';

export async function uploadImage(
  bucket: BucketName,
  userId: string,
  file: File
): Promise<string> {
  const fileName = `${Date.now()}_${file.name}`;
  const filePath = `${userId}/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });
  
  if (error) throw error;
  return filePath;
}

export async function deleteImage(
  bucket: BucketName,
  filePath: string
): Promise<void> {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);
  
  if (error) throw error;
}

export function getPublicUrl(bucket: BucketName, filePath: string): string {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

export async function getSignedUrl(
  bucket: BucketName,
  filePath: string,
  expiresIn: number = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresIn);
  
  if (error) throw error;
  return data.signedUrl;
}

export async function listUserImages(
  bucket: BucketName,
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(userId);
  
  if (error) throw error;
  return data.map(file => `${userId}/${file.name}`);
}
```

**Create `mobile/src/utils/storage.ts`:**
```typescript
import { supabase } from '../config/supabase';
// Similar to web/lib/storage.ts
```

## Supabase Storage Configuration

### Bucket Policies (SQL)

Run these in Supabase SQL Editor after creating buckets:

```sql
-- Enable RLS on storage.objects
alter table storage.objects enable row level security;

-- Recipe Images (Public bucket)
create policy "Public can view recipe images"
on storage.objects for select
to public
using (bucket_id = 'recipe-images');

create policy "Authenticated users can upload recipe images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'recipe-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update own recipe images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'recipe-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete own recipe images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'recipe-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Inventory Images (Private bucket)
create policy "Users can upload own inventory images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'inventory-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can view own inventory images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'inventory-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update own inventory images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'inventory-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete own inventory images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'inventory-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Labeling Images (Shared bucket for ML dataset)
create policy "Authenticated users can upload labeling images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'labeling-images');

create policy "Authenticated users can view labeling images"
on storage.objects for select
to authenticated
using (bucket_id = 'labeling-images');

create policy "Authenticated users can update labeling images"
on storage.objects for update
to authenticated
using (bucket_id = 'labeling-images');

create policy "Authenticated users can delete labeling images"
on storage.objects for delete
to authenticated
using (bucket_id = 'labeling-images');
```

## Implementation Steps

1. **Phase 1: Set Up Storage Infrastructure**
   - Create buckets in Supabase dashboard
   - Apply storage policies
   - Test bucket access with manual uploads

2. **Phase 2: Create Storage Utilities**
   - Create `web/lib/storage.ts`
   - Create `mobile/src/utils/storage.ts`
   - Add TypeScript types

3. **Phase 3: Migrate Web Inventory Uploads**
   - Update upload page
   - Test image upload, display, and deletion
   - Verify RLS policies

4. **Phase 4: Migrate Web Recipe Uploads**
   - Update recipe pages
   - Test image operations
   - Handle existing recipes without images

5. **Phase 5: Migrate Web Labeling Uploads**
   - Update labeling page
   - Test ML dataset image operations

6. **Phase 6: Migrate Mobile Uploads**
   - Update all mobile image upload flows
   - Test on both iOS and Android
   - Handle permissions properly

7. **Phase 7: Update Image Display**
   - Update all components showing images
   - Use appropriate URL method (public vs signed)
   - Add loading states and error handling

8. **Phase 8: Clean Up**
   - Remove Firebase Storage imports
   - Remove old storage references
   - Update any remaining hardcoded paths

## Testing Checklist

- [ ] Create bucket policies in Supabase
- [ ] Web: Upload inventory image
- [ ] Web: Display inventory image
- [ ] Web: Delete inventory image
- [ ] Web: Upload recipe image
- [ ] Web: Display recipe image
- [ ] Web: Delete recipe image
- [ ] Web: Upload labeling image
- [ ] Mobile: Upload inventory image from camera
- [ ] Mobile: Upload inventory image from gallery
- [ ] Mobile: Display inventory images
- [ ] Mobile: Delete inventory images
- [ ] Mobile: Upload recipe image
- [ ] Verify RLS prevents cross-user access
- [ ] Test signed URL expiration and refresh
- [ ] Test image compression/optimization
- [ ] Test large file uploads
- [ ] Test network error handling

## Migration Strategy for Existing Images

**Option 1: No Migration (Recommended)**
- Don't migrate existing Firebase Storage images
- New images go to Supabase Storage
- Display old images from Firebase (keep Firebase Storage read-only)
- Over time, images naturally migrate as users re-upload

**Option 2: Lazy Migration**
- On image display, check if it's a Firebase URL
- If yes, download and re-upload to Supabase
- Update database with new path
- Delete from Firebase (optional)

**Option 3: Bulk Migration Script**
- Create admin script to migrate all images
- Download from Firebase, upload to Supabase
- Update all database records
- Verify before deleting from Firebase

**Recommended: Option 1** (no data migration requirement from problem statement)

## Potential Issues & Solutions

1. **URL Format Changes**
   - Firebase: Full URLs stored in database
   - Supabase: Store paths, generate URLs on-demand
   - Solution: Helper functions to handle both formats during transition

2. **Signed URL Expiration**
   - Private bucket images need signed URLs
   - URLs expire after set time
   - Solution: Generate signed URLs on component mount, refresh if expired

3. **Large Files**
   - Default upload limits may differ
   - Solution: Configure bucket size limits, implement client-side compression

4. **Mobile File URIs**
   - React Native uses different file URI formats
   - Solution: Convert to blob before upload

5. **Progress Indication**
   - Users need feedback during uploads
   - Solution: Use Supabase upload progress events

## Files Summary

**New files:**
- `web/lib/storage.ts` - Storage utility functions for web
- `mobile/src/utils/storage.ts` - Storage utility functions for mobile
- `supabase/migrations/20260220000011_create_storage_policies.sql` - Storage policies

**Modified files (Web):**
- `web/app/upload/page.tsx`
- `web/app/recipes/page.tsx`
- `web/app/labeling/page.tsx`
- `web/app/inventory/page.tsx` (display)
- `web/app/recipe/page.tsx` (display)
- All components displaying images

**Modified files (Mobile):**
- `mobile/src/screens/main/InventoryScreen.tsx`
- `mobile/src/screens/main/RecipesScreen.tsx`
- `mobile/src/screens/main/LabelingScreen.tsx`
- `mobile/src/utils/imageUtils.ts`

## Estimated Complexity
- **Lines of code changed:** ~1,200-1,500
- **Files modified:** ~15
- **Estimated time:** 4-5 hours
- **Risk level:** Low-Medium (straightforward API swap with good abstraction)
