<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/auth.js';
  import { materials, loading, fetchMaterials, deleteMaterial, updateMaterial, formatFileSize, getFileTypeIcon, getFileTypeColor } from '$lib/stores/materials.js';
  import { supabase } from '$lib/supabase.js';
  import FolderCreateModal from './FolderCreateModal.svelte';
  import FileUploadModal from './FileUploadModal.svelte';
  
  export let type = 'original';
  
  let filteredMaterials = [];
  let displayItems = [];
  let subjects = [];
  let searchTerm = '';
  let sortBy = 'created_at';
  let sortOrder = 'desc';
  let viewType = 'grid'; // 'grid' or 'list'
  let selectedSubject = 'all';
  let selectedExtractionStatus = 'all';
  
  // 타입이 변경될 때마다 필터 초기화
  $: if (type) {
    selectedSubject = 'all';
    selectedExtractionStatus = 'all';
  }
  let currentFolder = '/';
  let draggedMaterial = null;
  let dropTarget = null;
  let showEditModal = false;
  let editingMaterial = null;
  let showFolderModal = false;
  let folderParentId = null;
  let currentFolderId = null;
  let folders = [];
  let showUploadModal = false;
  let showFolderEditModal = false;
  let editingFolder = null;
  let selectedItems = new Set(); // 선택된 아이템들 관리

  // 사용자가 변경되거나 타입이 변경될 때 데이터 재조회
  $: if ($user?.id && type) {
    loadMaterials();
    loadFolders();
  }
  $: displayItems = getDisplayItems($materials, folders, type, currentFolder);
  $: subjects = getUniqueSubjects($materials, type);
  $: filteredMaterials = getFilteredDisplayItems(displayItems);

  function getDisplayItems(materials, folders, type, currentFolder) {
    const items = [];
    
    // 현재 폴더의 하위 폴더들 추가
    const currentFolders = folders.filter(folder => {
      // 현재 폴더가 루트일 때는 parent_id가 null인 폴더들
      if (currentFolder === '/') {
        return !folder.parent_id;
      }
      // 그 외에는 parent_id가 현재 폴더 ID와 일치하는 폴더들
      return folder.parent_id === currentFolderId;
    });
    
    currentFolders.forEach(folder => {
      items.push({
        ...folder,
        type: 'folder',
        path: buildFolderPath(folder, folders),
        count: countFolderItems(folder.id, materials, folders)
      });
    });
    
    // 현재 폴더의 파일들 추가
    const filteredMaterials = materials.filter(m => m.type === type);
    filteredMaterials.forEach(material => {
      // folder_id로 매칭 (기존 folder_path 대신)
      if ((currentFolder === '/' && !material.folder_id) || 
          (currentFolderId && material.folder_id === currentFolderId)) {
        items.push({
          ...material,
          type: 'file'
        });
      }
    });
    
    
    // 폴더를 먼저, 그 다음 파일들을 정렬
    const result = items.sort((a, b) => {
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;
      return (a.name || a.title).localeCompare(b.name || b.title);
    });
    
    
    return result;
  }

  function getFilteredDisplayItems(items) {
    
    let filtered = items.filter(item => {
      if (item.type === 'folder') {
        // 폴더는 항상 표시
        return true;
      } else {
        // 파일은 검색 및 필터 조건 적용
        const matchesSearch = !searchTerm || 
          item.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSubject = selectedSubject === 'all' || item.subject === selectedSubject;
        const matchesExtractionStatus = selectedExtractionStatus === 'all' || 
          (selectedExtractionStatus === 'extracted' && item.is_extracted) ||
          (selectedExtractionStatus === 'not_extracted' && !item.is_extracted);
        
        
        return matchesSearch && matchesSubject && matchesExtractionStatus;
      }
    });

    // 정렬 적용 (파일만)
    const folders = filtered.filter(item => item.type === 'folder');
    const files = filtered.filter(item => item.type === 'file');
    
    files.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (sortBy === 'created_at') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return [...folders, ...files];
  }

  function getUniqueSubjects(materials, type) {
    const subjectSet = new Set();
    materials
      .filter(m => m.type === type && m.subject)
      .forEach(m => subjectSet.add(m.subject));
    return Array.from(subjectSet).sort();
  }

  function navigateToFolder(folder) {
    if (folder.type === 'folder') {
      currentFolder = folder.path;
      currentFolderId = folder.id;
    } else if (typeof folder === 'string') {
      // 루트로 이동하는 경우
      currentFolder = folder;
      currentFolderId = null;
    }
  }

  function goUpFolder() {
    if (currentFolder === '/') return;
    
    // 현재 폴더의 부모 폴더 찾기
    const currentFolderData = folders.find(f => f.id === currentFolderId);
    if (currentFolderData && currentFolderData.parent_id) {
      const parentFolder = folders.find(f => f.id === currentFolderData.parent_id);
      if (parentFolder) {
        currentFolder = buildFolderPath(parentFolder, folders);
        currentFolderId = parentFolder.id;
      } else {
        currentFolder = '/';
        currentFolderId = null;
      }
    } else {
      currentFolder = '/';
      currentFolderId = null;
    }
  }

  async function loadMaterials() {
    if ($user?.id) {
      await fetchMaterials($user.id, type);
    }
  }
  
  async function loadFolders() {
    if (!$user?.id) return;
    
    try {
      // Supabase로 직접 폴더 조회
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', $user.id)
        .eq('type', type)
        .order('name');
      
      if (error) {
        console.error('Failed to load folders:', error);
      } else {
        folders = data || [];
        console.log('Loaded folders:', folders.length);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  }
  
  function buildFolderPath(folder, allFolders) {
    const pathParts = [folder.name];
    let currentFolder = folder;
    
    while (currentFolder.parent_id) {
      const parent = allFolders.find(f => f.id === currentFolder.parent_id);
      if (!parent) break;
      pathParts.unshift(parent.name);
      currentFolder = parent;
    }
    
    return '/' + pathParts.join('/');
  }
  
  function countFolderItems(folderId, materials, folders) {
    let count = 0;
    
    // 직접 하위 파일 수
    count += materials.filter(m => m.folder_id === folderId).length;
    
    // 하위 폴더들의 아이템 수 (재귀적으로)
    const subfolders = folders.filter(f => f.parent_id === folderId);
    subfolders.forEach(subfolder => {
      count += countFolderItems(subfolder.id, materials, folders);
    });
    
    return count;
  }

  function handleUpload() {
    showUploadModal = true;
  }
  
  async function handleFilesUploaded(event) {
    const { results, successCount } = event.detail;
    if (successCount > 0) {
      // 파일이 업로드되면 자료 목록을 다시 불러옴
      await loadMaterials();
      
      // 첫 번째 성공한 파일에 대해 문항 추출 여부 확인
      const firstSuccess = results.find(r => r.success);
      if (firstSuccess && firstSuccess.data) {
        showToast(`"${firstSuccess.data.title}" 업로드 완료!`, 'success');
        
        // PDF나 이미지 파일인 경우 문항 추출 페이지로 이동할지 확인
        const extractableTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (extractableTypes.includes(firstSuccess.data.file_type)) {
          if (confirm('업로드한 파일에서 문항을 추출하시겠습니까?')) {
            goto(`/extract?materialId=${firstSuccess.data.id}`);
          }
        }
      }
    }
    showUploadModal = false;
  }

  function handleCreate() {
    goto('/create-material');
  }
  
  function handleNewFolder() {
    // 현재 폴더에서 새 폴더 생성
    folderParentId = currentFolderId;
    showFolderModal = true;
  }
  
  function handleFolderCreated(event) {
    const newFolder = event.detail;
    
    // 개발 모드에서는 localStorage에 저장
    if (!supabase) {
      const savedFolders = localStorage.getItem('folders');
      const allFolders = savedFolders ? JSON.parse(savedFolders) : [];
      allFolders.push(newFolder);
      localStorage.setItem('folders', JSON.stringify(allFolders));
      folders = allFolders;
    }
    
    // 폴더가 생성되면 폴더 목록을 다시 불러옴
    loadFolders();
    showFolderModal = false;
  }

  function handleExtract(material) {
    // 선택된 자료의 ID를 URL 파라미터로 전달하여 문항 추출 페이지로 이동
    goto(`/extract?materialId=${material.id}`);
  }

  function handleEdit(material) {
    editingMaterial = { ...material };
    showEditModal = true;
  }

  function closeEditModal() {
    showEditModal = false;
    editingMaterial = null;
  }

  async function saveEditedMaterial() {
    if (!editingMaterial) return;
    
    if (!editingMaterial.title.trim()) {
      showToast('자료 이름을 입력해주세요.', 'error');
      return;
    }
    
    if (!editingMaterial.subject) {
      showToast('과목을 선택해주세요.', 'error');
      return;
    }
    
    // 폴더 경로 정규화 (folder_id 기반으로 변경)
    if (editingMaterial.folder_path) {
      editingMaterial.folder_path = editingMaterial.folder_path.trim();
      if (!editingMaterial.folder_path.startsWith('/')) {
        editingMaterial.folder_path = '/' + editingMaterial.folder_path;
      }
      editingMaterial.folder_path = editingMaterial.folder_path.replace(/\/+/g, '/');
      if (editingMaterial.folder_path.length > 1 && editingMaterial.folder_path.endsWith('/')) {
        editingMaterial.folder_path = editingMaterial.folder_path.slice(0, -1);
      }
    }
    
    try {
      // updateMaterial 함수 사용
      const updates = {
        title: editingMaterial.title.trim(),
        subject: editingMaterial.subject
      };
      
      const { data, error } = await updateMaterial(editingMaterial.id, updates);
      
      if (error) {
        showToast('저장 중 오류가 발생했습니다.', 'error');
        console.error('Error saving material:', error);
      } else {
        showToast('자료가 성공적으로 수정되었습니다.', 'success');
        closeEditModal();
        // 데이터 새로고침
        loadMaterials();
      }
    } catch (error) {
      console.error('Error saving material:', error);
      showToast('저장 중 오류가 발생했습니다.', 'error');
    }
  }

  async function resetExtractionStatus() {
    if (!editingMaterial) return;
    
    if (confirm('추출 상태를 초기화하시겠습니까? 추출된 문항 정보가 삭제됩니다.')) {
      editingMaterial.is_extracted = false;
      editingMaterial.extracted_count = 0;
      editingMaterial.extraction_date = null;
      
      // 상태 업데이트도 저장
      const updates = {
        is_extracted: false,
        extracted_count: 0,
        extraction_date: null
      };
      
      const { error } = await updateMaterial(editingMaterial.id, updates);
      if (error) {
        showToast('추출 상태 초기화 중 오류가 발생했습니다.', 'error');
      } else {
        showToast('추출 상태가 초기화되었습니다.', 'info');
      }
    }
  }

  async function handleDelete(material) {
    if (confirm(`"${material.title}"을(를) 삭제하시겠습니까?`)) {
      const { error } = await deleteMaterial(material.id);
      if (error) {
        showToast('삭제 중 오류가 발생했습니다.', 'error');
      } else {
        showToast(`"${material.title}"이(가) 삭제되었습니다.`, 'success');
        loadMaterials(); // 삭제 후 목록 새로고침
      }
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ko-KR');
  }

  // 드래그앤드롭 함수들
  function handleDragStart(e, material) {
    draggedMaterial = material;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.currentTarget.style.opacity = '0.5';
  }

  function handleDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    draggedMaterial = null;
    dropTarget = null;
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
  }

  function handleDragEnter(e, material) {
    if (draggedMaterial && draggedMaterial.id !== material.id) {
      dropTarget = material;
      e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
    }
  }

  function handleDragLeave(e) {
    e.currentTarget.style.backgroundColor = '';
  }

  function handleDrop(e, targetMaterial) {
    e.preventDefault();
    e.currentTarget.style.backgroundColor = '';
    
    // 안전하게 처리
    if (draggedMaterial && targetMaterial && draggedMaterial.id !== targetMaterial.id) {
      const draggedTitle = draggedMaterial.title || '자료';
      const targetPath = targetMaterial.folder_path || '/';
      
      if (targetMaterial.folder_path && draggedMaterial.folder_path !== targetMaterial.folder_path) {
        console.log(`Moving ${draggedTitle} to ${targetPath}`);
        showToast(`"${draggedTitle}"을(를) "${targetPath}" 폴더로 이동했습니다.`, 'info');
      }
    }
    
    draggedMaterial = null;
    dropTarget = null;
    return false;
  }

  async function handleFolderDrop(e, folderId) {
    e.preventDefault();
    e.currentTarget.classList.remove('ring-2', 'ring-primary', 'bg-primary/10');
    
    // draggedMaterial이 없으면 종료
    if (!draggedMaterial) {
      console.log('No material being dragged');
      return false;
    }
    
    // 같은 폴더로 이동하는 경우 종료
    if (draggedMaterial.folder_id === folderId) {
      draggedMaterial = null;
      dropTarget = null;
      return false;
    }
    
    try {
      // 드래그 중인 자료 정보를 미리 저장
      const materialTitle = draggedMaterial.title;
      const materialId = draggedMaterial.id;
      
      // 개발 모드에서는 로컬 업데이트
      if (!supabase) {
        // materials 업데이트
        const savedMaterials = localStorage.getItem('materials');
        const allMaterials = savedMaterials ? JSON.parse(savedMaterials) : [];
        const updatedMaterials = allMaterials.map(m => 
          m.id === materialId ? { ...m, folder_id: folderId } : m
        );
        localStorage.setItem('materials', JSON.stringify(updatedMaterials));
        
        const folder = folders.find(f => f.id === folderId);
        const folderName = folder ? folder.name : '루트';
        
        // 토스트 메시지 표시
        showToast(`"${materialTitle}"을(를) "${folderName}" 폴더로 이동했습니다.`, 'success');
        loadMaterials();
      } else {
        // Supabase로 직접 자료 업데이트
        const { error } = await updateMaterial(materialId, { folder_id: folderId });
        
        if (!error) {
          const folder = folders.find(f => f.id === folderId);
          const folderName = folder ? folder.name : '루트';
          showToast(`"${materialTitle}"을(를) "${folderName}" 폴더로 이동했습니다.`, 'success');
          loadMaterials();
        } else {
          showToast('자료 이동 중 오류가 발생했습니다.', 'error');
        }
      }
    } catch (error) {
      console.error('Error moving material:', error);
      showToast('자료 이동 중 오류가 발생했습니다.', 'error');
    } finally {
      // 항상 드래그 상태 초기화
      draggedMaterial = null;
      dropTarget = null;
    }
    
    return false;
  }
  
  function handleDragEnterFolder(e) {
    if (draggedMaterial) {
      e.currentTarget.classList.add('ring-2', 'ring-primary', 'bg-primary/10');
    }
  }
  
  function handleDragLeaveFolder(e) {
    e.currentTarget.classList.remove('ring-2', 'ring-primary', 'bg-primary/10');
  }
  
  // 토스트 메시지 표시
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-top toast-end`;
    toast.innerHTML = `
      <div class="alert alert-${type}">
        <span>${message}</span>
      </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // 아이템 선택 처리
  function toggleItemSelection(itemId) {
    if (selectedItems.has(itemId)) {
      selectedItems.delete(itemId);
    } else {
      selectedItems.add(itemId);
    }
    selectedItems = new Set(selectedItems); // 반응성 업데이트
  }

  function clearSelection() {
    selectedItems = new Set();
  }

  // 전체 선택
  function selectAll() {
    filteredMaterials.forEach(item => {
      if (item.type === 'file') {
        selectedItems.add(item.id);
      }
    });
    selectedItems = new Set(selectedItems);
  }

  // 파일 타입별 아이콘 (수학비서 스타일)
  function getFileIcon(fileType) {
    if (!fileType) return 'document';
    
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return 'pdf';
    if (type.includes('word') || type.includes('doc')) return 'word';
    if (type.includes('excel') || type.includes('sheet')) return 'excel';
    if (type.includes('powerpoint') || type.includes('presentation')) return 'ppt';
    if (type.includes('image') || type.includes('jpg') || type.includes('png')) return 'image';
    
    return 'document';
  }

  // 폴더 편집
  function handleEditFolder(folder) {
    editingFolder = { ...folder };
    showFolderEditModal = true;
  }

  // 폴더 삭제
  async function handleDeleteFolder(folder) {
    // 폴더가 비어있는지 확인
    const hasSubfolders = folders.some(f => f.parent_id === folder.id);
    const hasMaterials = $materials.some(m => m.folder_id === folder.id);
    
    if (hasSubfolders || hasMaterials) {
      showToast('폴더가 비어있지 않습니다. 먼저 내용을 삭제하거나 이동하세요.', 'error');
      return;
    }
    
    if (confirm(`"${folder.name}" 폴더를 삭제하시겠습니까?`)) {
      try {
        if (!supabase) {
          // 개발 모드에서는 localStorage에서 삭제
          const savedFolders = localStorage.getItem('folders') || '[]';
          const allFolders = JSON.parse(savedFolders);
          const updatedFolders = allFolders.filter(f => f.id !== folder.id);
          localStorage.setItem('folders', JSON.stringify(updatedFolders));
          
          showToast(`"${folder.name}" 폴더가 삭제되었습니다.`, 'success');
          loadFolders();
        } else {
          // Supabase로 직접 폴더 삭제
          const { error } = await supabase
            .from('folders')
            .delete()
            .eq('id', folder.id);
          
          if (error) {
            showToast(error.message || '폴더 삭제 중 오류가 발생했습니다.', 'error');
          } else {
            showToast(`"${folder.name}" 폴더가 삭제되었습니다.`, 'success');
            loadFolders();
          }
        }
      } catch (error) {
        console.error('Error deleting folder:', error);
        showToast('폴더 삭제 중 오류가 발생했습니다.', 'error');
      }
    }
  }

  // 폴더 저장
  async function saveFolderEdit() {
    if (!editingFolder) return;
    
    if (!editingFolder.name || !editingFolder.name.trim()) {
      showToast('폴더 이름을 입력해주세요.', 'error');
      return;
    }
    
    try {
      if (!supabase) {
        // 개발 모드에서는 localStorage 업데이트
        const savedFolders = localStorage.getItem('folders') || '[]';
        const allFolders = JSON.parse(savedFolders);
        const index = allFolders.findIndex(f => f.id === editingFolder.id);
        if (index !== -1) {
          allFolders[index] = { ...allFolders[index], name: editingFolder.name.trim(), color: editingFolder.color };
          localStorage.setItem('folders', JSON.stringify(allFolders));
        }
        
        showToast(`폴더 이름이 "${editingFolder.name}"(으)로 변경되었습니다.`, 'success');
        showFolderEditModal = false;
        editingFolder = null;
        loadFolders();
      } else {
        // Supabase로 직접 폴더 업데이트
        const { error } = await supabase
          .from('folders')
          .update({ 
            name: editingFolder.name.trim(), 
            color: editingFolder.color 
          })
          .eq('id', editingFolder.id);
        
        if (error) {
          showToast(error.message || '폴더 수정 중 오류가 발생했습니다.', 'error');
        } else {
          showToast(`폴더 이름이 "${editingFolder.name}"(으)로 변경되었습니다.`, 'success');
          showFolderEditModal = false;
          editingFolder = null;
          loadFolders();
        }
      }
    } catch (error) {
      console.error('Error updating folder:', error);
      showToast('폴더 수정 중 오류가 발생했습니다.', 'error');
    }
  }

  onMount(() => {
    if ($user?.id) {
      loadMaterials();
    }
  });
</script>

<div class="space-y-4">
  <!-- 필터 및 검색 -->
  <div class="bg-base-100 rounded-lg shadow p-4 space-y-4">
    <!-- 브레드크럼 네비게이션 -->
    <div class="flex items-center gap-2 text-sm">
      <button 
        class="btn btn-ghost btn-xs" 
        on:click={() => navigateToFolder('/')}
        class:btn-active={currentFolder === '/'}
      >
        🏠 홈
      </button>
      {#if currentFolder !== '/'}
        {#each currentFolder.split('/').filter(Boolean) as folderName, index}
          <span class="text-base-content/50">/</span>
          <button 
            class="btn btn-ghost btn-xs"
            on:click={() => {
              const pathParts = currentFolder.split('/').filter(Boolean).slice(0, index + 1);
              const targetPath = '/' + pathParts.join('/');
              const targetFolder = folders.find(f => buildFolderPath(f, folders) === targetPath);
              if (targetFolder) {
                navigateToFolder(targetFolder);
              }
            }}
          >
            📁 {folderName}
          </button>
        {/each}
      {/if}
    </div>
    
    <!-- 상단: 검색 및 필터 -->
    <div class="flex flex-col lg:flex-row gap-4 justify-between">
      <!-- 검색 -->
      <div class="flex-1 max-w-md">
        <input
          type="text"
          placeholder="자료 검색..."
          class="input input-bordered w-full"
          bind:value={searchTerm}
        />
      </div>
      
      <!-- 필터들 -->
      <div class="flex flex-wrap gap-3 items-center">
        <!-- 과목 필터 -->
        <select class="select select-bordered select-sm" bind:value={selectedSubject}>
          <option value="all">모든 과목</option>
          {#each subjects as subject}
            <option value={subject}>{subject}</option>
          {/each}
        </select>
        
        <!-- 추출 상태 필터 -->
        <select class="select select-bordered select-sm" bind:value={selectedExtractionStatus}>
          <option value="all">추출 상태</option>
          <option value="extracted">추출 완료</option>
          <option value="not_extracted">추출 전</option>
        </select>
      </div>
    </div>
  </div>
  
  <!-- 루트 폴더 드롭 영역 (현재 폴더가 루트가 아닐 때만 표시) -->
  {#if currentFolder !== '/'}
    <div 
      class="bg-base-200 rounded-lg p-4 mb-4 border-2 border-dashed border-base-300 transition-all"
      on:dragover={handleDragOver}
      on:dragenter={handleDragEnterFolder}
      on:dragleave={handleDragLeaveFolder}
      on:drop={(e) => handleFolderDrop(e, null)}
    >
      <div class="flex items-center justify-center gap-2 text-base-content/50">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
        </svg>
        <span>루트 폴더로 이동하려면 여기에 드롭하세요</span>
      </div>
    </div>
  {/if}
  
  <!-- 선택된 아이템이 있을 때 표시되는 툴바 -->
  {#if selectedItems.size > 0}
    <div class="bg-primary/10 rounded-lg p-3 mb-4 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <span class="font-medium">{selectedItems.size}개 선택됨</span>
        <button class="btn btn-sm btn-ghost" on:click={selectAll}>전체 선택</button>
        <button class="btn btn-sm btn-ghost" on:click={clearSelection}>선택 해제</button>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-sm btn-error" on:click={() => {
          if (confirm(`선택한 ${selectedItems.size}개 항목을 삭제하시겠습니까?`)) {
            // 선택된 아이템들 삭제 처리
            selectedItems.forEach(id => {
              const item = filteredMaterials.find(m => m.id === id);
              if (item && item.type === 'file') {
                handleDelete(item);
              }
            });
            clearSelection();
          }
        }}>
          삭제
        </button>
      </div>
    </div>
  {/if}

  <!-- 뷰 컨트롤 -->
  <div class="flex justify-between items-center">
    <!-- 정렬, 뷰 타입 및 액션 버튼 -->
    <div class="flex gap-3 items-center">
      <!-- 뷰 타입 토글 -->
      <div class="join">
        <button 
          class="btn btn-sm join-item {viewType === 'grid' ? 'btn-active' : ''}"
          on:click={() => viewType = 'grid'}
          title="카드 보기"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
          </svg>
        </button>
        <button 
          class="btn btn-sm join-item {viewType === 'list' ? 'btn-active' : ''}"
          on:click={() => viewType = 'list'}
          title="리스트 보기"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
          </svg>
        </button>
      </div>
      
      <!-- 정렬 옵션 -->
      <div class="flex items-center gap-2">
        <select class="select select-bordered select-sm" bind:value={sortBy}>
          <option value="created_at">생성일</option>
          <option value="title">제목</option>
          <option value="file_size">크기</option>
        </select>
        <button 
          class="btn btn-ghost btn-sm"
          on:click={() => sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'}
        >
          {#if sortOrder === 'asc'}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"></path>
            </svg>
          {:else}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"></path>
            </svg>
          {/if}
        </button>
      </div>
      
      <!-- 액션 버튼 -->
      <button class="btn btn-secondary" on:click={handleNewFolder}>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
        </svg>
        새 폴더
      </button>
      
      {#if type === 'original'}
        <button class="btn btn-primary" on:click={handleUpload}>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
          </svg>
          자료 올리기
        </button>
      {/if}
      
      <button class="btn btn-success" on:click={handleCreate}>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        자료 만들기
      </button>
    </div>
  </div>

  <!-- 로딩 상태 -->
  {#if $loading}
    <div class="flex justify-center py-8">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else}
    <!-- 자료 목록 -->
    {#if viewType === 'grid'}
      <!-- 카드 뷰 (수학비서 스타일) -->
      <div class="grid grid-cols-2 gap-4">
        {#each filteredMaterials as item}
          {#if item.type === 'folder'}
            <!-- 폴더 카드 -->
            <div 
              class="relative bg-base-100 rounded-lg border border-base-200 hover:shadow-lg transition-all cursor-pointer group"
              on:click={() => navigateToFolder(item)}
              on:dragover={handleDragOver}
              on:dragenter={handleDragEnterFolder}
              on:dragleave={handleDragLeaveFolder}
              on:drop={(e) => handleFolderDrop(e, item.id)}
            >
              <div class="p-4">
                <div class="flex items-start justify-between mb-3">
                  <div class="flex items-center gap-3">
                    <div class="text-3xl" style="color: {item.color || '#gray'}">📁</div>
                    <div>
                      <h3 class="font-medium text-base">{item.name}</h3>
                      <p class="text-sm text-base-content/60">{item.count}개 항목</p>
                    </div>
                  </div>
                  <div class="dropdown dropdown-end">
                    <div tabindex="0" role="button" class="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity" on:click|stopPropagation>
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                      </svg>
                    </div>
                    <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-40 p-2 shadow">
                      <li><button on:click|stopPropagation={() => handleEditFolder(item)}>이름 변경</button></li>
                      <li><button on:click|stopPropagation={() => handleDeleteFolder(item)} class="text-error">삭제</button></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          {:else}
            <!-- 파일 카드 (수학비서 스타일) -->
            <div 
              class="relative bg-base-100 rounded-lg border border-base-200 hover:shadow-lg transition-all cursor-pointer group"
              draggable="true"
              on:dragstart={(e) => handleDragStart(e, item)}
              on:dragend={handleDragEnd}
            >
              <div class="p-4">
                <!-- 상단: 체크박스와 아이콘 -->
                <div class="flex items-start justify-between mb-3">
                  <div class="flex items-start gap-3">
                    <!-- 체크박스 -->
                    <input 
                      type="checkbox" 
                      class="checkbox checkbox-primary checkbox-sm mt-1"
                      checked={selectedItems.has(item.id)}
                      on:click|stopPropagation={() => toggleItemSelection(item.id)}
                    />
                    
                    <!-- 파일 아이콘 -->
                    <div class="flex flex-col items-center">
                      {#if getFileIcon(item.file_type) === 'pdf'}
                        <svg class="w-10 h-10 text-error" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M10,17L8,13H10L11,16L12,13H14L12,17V19H10V17Z"/>
                        </svg>
                      {:else if getFileIcon(item.file_type) === 'word'}
                        <svg class="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M15.5,17H14L12,9.5L10,17H8.5L6.1,7H7.8L9.34,14.5L11.3,7H12.7L14.67,14.5L16.2,7H17.9M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z"/>
                        </svg>
                      {:else if getFileIcon(item.file_type) === 'excel'}
                        <svg class="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19M15.78,17H14.22L12,13.8L9.78,17H8.22L11.1,12L8.22,7H9.78L12,10.2L14.22,7H15.78L12.9,12L15.78,17Z"/>
                        </svg>
                      {:else if getFileIcon(item.file_type) === 'ppt'}
                        <svg class="w-10 h-10 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8,7H16A1,1 0 0,1 17,8V10.33C16.03,9.62 14.76,9.23 13.5,9.23A5.23,5.23 0 0,0 8.27,14.46A5.23,5.23 0 0,0 13.5,19.69C14.76,19.69 16.03,19.3 17,18.59V19A1,1 0 0,1 16,20H8A1,1 0 0,1 7,19V8A1,1 0 0,1 8,7M5,3H19A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5A2,2 0 0,1 5,3M10.46,11.24C10.46,9.97 11.36,8.96 12.63,8.96H15.46V10.19H12.79C12.12,10.19 11.79,10.5 11.79,11.11V13.58C11.79,14.18 12.12,14.5 12.79,14.5H15.46V15.73H12.63C11.36,15.73 10.46,14.71 10.46,13.45V11.24Z"/>
                        </svg>
                      {:else if getFileIcon(item.file_type) === 'image'}
                        <svg class="w-10 h-10 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z"/>
                        </svg>
                      {:else}
                        <svg class="w-10 h-10 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M13,9V3.5L18.5,9M6,2C4.89,2 4,2.89 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6Z"/>
                        </svg>
                      {/if}
                      <span class="text-xs text-base-content/60 mt-1">
                        {item.file_type ? item.file_type.split('/')[1].toUpperCase() : 'FILE'}
                      </span>
                    </div>
                    
                    <!-- 제목과 정보 -->
                    <div class="flex-1 min-w-0">
                      <h3 class="font-medium text-base mb-1 line-clamp-2">{item.title}</h3>
                      <div class="flex items-center gap-3 text-sm text-base-content/60">
                        <span>작성자</span>
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                      
                      <!-- 태그들 -->
                      <div class="flex flex-wrap gap-1 mt-2">
                        {#if item.subject}
                          <span class="badge badge-sm badge-ghost">{item.subject}</span>
                        {/if}
                        {#if item.is_extracted}
                          <span class="badge badge-sm badge-success">추출완료 ({item.extracted_count})</span>
                        {:else}
                          <span class="badge badge-sm badge-warning">추출전</span>
                        {/if}
                        {#if item.pages}
                          <span class="badge badge-sm badge-ghost">{item.pages}페이지</span>
                        {/if}
                      </div>
                    </div>
                  </div>
                  
                  <!-- 우측: 즐겨찾기와 메뉴 -->
                  <div class="flex items-start gap-1">
                    <button class="btn btn-ghost btn-xs" on:click|stopPropagation>
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                      </svg>
                    </button>
                    
                    <div class="dropdown dropdown-end">
                      <div tabindex="0" role="button" class="btn btn-ghost btn-xs" on:click|stopPropagation>
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                        </svg>
                      </div>
                      <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-40 p-2 shadow">
                        {#if type === 'original'}
                          <li><button on:click|stopPropagation={() => handleExtract(item)}>문항 추출</button></li>
                        {/if}
                        <li><button on:click|stopPropagation={() => handleEdit(item)}>편집</button></li>
                        <li><button on:click|stopPropagation={() => handleDelete(item)} class="text-error">삭제</button></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {/if}
        {/each}
      </div>
    {:else}
      <!-- 리스트 뷰 -->
      <div class="bg-base-100 rounded-lg shadow">
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th class="w-12">
                  <input 
                    type="checkbox" 
                    class="checkbox checkbox-primary checkbox-sm"
                    on:click={() => {
                      if (selectedItems.size === filteredMaterials.filter(item => item.type === 'file').length) {
                        clearSelection();
                      } else {
                        selectAll();
                      }
                    }}
                  />
                </th>
                <th>파일</th>
                <th>이름</th>
                <th>과목/폴더</th>
                <th>추출상태</th>
                <th>크기</th>
                <th>페이지</th>
                <th>생성일</th>
                <th class="text-right">액션</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredMaterials as item}
                {#if item.type === 'folder'}
                  <tr 
                    class="hover:bg-base-200 cursor-pointer transition-all"
                    on:click={() => navigateToFolder(item)}
                    on:dragover={handleDragOver}
                    on:dragenter={handleDragEnterFolder}
                    on:dragleave={handleDragLeaveFolder}
                    on:drop={(e) => handleFolderDrop(e, item.id)}
                  >
                    <td>
                      <!-- 폴더는 체크박스 대신 빈 공간 -->
                    </td>
                    <td>
                      <div class="text-2xl" style="color: {item.color || '#gray'}">📁</div>
                    </td>
                    <td>
                      <div class="font-medium">{item.name}</div>
                      <div class="text-xs text-base-content/70">폴더</div>
                    </td>
                    <td>
                      <span class="badge badge-neutral badge-xs">{item.count}개 항목</span>
                    </td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td class="text-right">
                      <div class="flex gap-2 justify-end">
                        <button 
                          class="btn btn-ghost btn-xs"
                          on:click|stopPropagation={() => navigateToFolder(item)}
                        >
                          열기
                        </button>
                        <div class="dropdown dropdown-end">
                          <div tabindex="0" role="button" class="btn btn-ghost btn-xs" on:click|stopPropagation>
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                            </svg>
                          </div>
                          <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-40 p-2 shadow">
                            <li><button on:click|stopPropagation={() => handleEditFolder(item)}>이름 변경</button></li>
                            <li><button on:click|stopPropagation={() => handleDeleteFolder(item)} class="text-error">삭제</button></li>
                          </ul>
                        </div>
                      </div>
                    </td>
                  </tr>
                {:else}
                  <!-- 파일 행 -->
                  <tr 
                    class="hover:bg-base-200 cursor-move"
                    draggable="true"
                    on:dragstart={(e) => handleDragStart(e, item)}
                    on:dragend={handleDragEnd}
                    on:dragover={handleDragOver}
                    on:dragenter={(e) => handleDragEnter(e, item)}
                    on:dragleave={handleDragLeave}
                    on:drop={(e) => handleDrop(e, item)}
                  >
                    <td>
                      <input 
                        type="checkbox" 
                        class="checkbox checkbox-primary checkbox-sm"
                        checked={selectedItems.has(item.id)}
                        on:click|stopPropagation={() => toggleItemSelection(item.id)}
                      />
                    </td>
                    <td>
                      <div class="relative">
                        {#if getFileIcon(item.file_type) === 'pdf'}
                          <svg class="w-8 h-8 text-error" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M10,17L8,13H10L11,16L12,13H14L12,17V19H10V17Z"/>
                          </svg>
                        {:else if getFileIcon(item.file_type) === 'word'}
                          <svg class="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M15.5,17H14L12,9.5L10,17H8.5L6.1,7H7.8L9.34,14.5L11.3,7H12.7L14.67,14.5L16.2,7H17.9M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z"/>
                          </svg>
                        {:else if getFileIcon(item.file_type) === 'excel'}
                          <svg class="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19M15.78,17H14.22L12,13.8L9.78,17H8.22L11.1,12L8.22,7H9.78L12,10.2L14.22,7H15.78L12.9,12L15.78,17Z"/>
                          </svg>
                        {:else if getFileIcon(item.file_type) === 'ppt'}
                          <svg class="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8,7H16A1,1 0 0,1 17,8V10.33C16.03,9.62 14.76,9.23 13.5,9.23A5.23,5.23 0 0,0 8.27,14.46A5.23,5.23 0 0,0 13.5,19.69C14.76,19.69 16.03,19.3 17,18.59V19A1,1 0 0,1 16,20H8A1,1 0 0,1 7,19V8A1,1 0 0,1 8,7M5,3H19A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5A2,2 0 0,1 5,3M10.46,11.24C10.46,9.97 11.36,8.96 12.63,8.96H15.46V10.19H12.79C12.12,10.19 11.79,10.5 11.79,11.11V13.58C11.79,14.18 12.12,14.5 12.79,14.5H15.46V15.73H12.63C11.36,15.73 10.46,14.71 10.46,13.45V11.24Z"/>
                          </svg>
                        {:else if getFileIcon(item.file_type) === 'image'}
                          <svg class="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z"/>
                          </svg>
                        {:else}
                          <svg class="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M13,9V3.5L18.5,9M6,2C4.89,2 4,2.89 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6Z"/>
                          </svg>
                        {/if}
                        {#if item.is_extracted}
                          <div class="absolute -top-1 -right-1 w-3 h-3 bg-success text-success-content rounded-full flex items-center justify-center text-xs">
                            ✓
                          </div>
                        {/if}
                      </div>
                    </td>
                    <td>
                      <div class="font-medium">{item.title}</div>
                      <div class="text-xs text-base-content/70">
                        {item.file_type ? item.file_type.split('/')[1].toUpperCase() : '-'}
                      </div>
                    </td>
                    <td>
                      <div class="flex flex-col gap-1">
                        {#if item.subject}
                          <span class="badge badge-primary badge-xs">{item.subject}</span>
                        {/if}
                        {#if item.folder_path && item.folder_path !== '/'}
                          <span class="badge badge-outline badge-xs text-xs">📁 {item.folder_path}</span>
                        {/if}
                      </div>
                    </td>
                    <td>
                      {#if item.is_extracted}
                        <div class="badge badge-success badge-sm">
                          추출완료 ({item.extracted_count}개)
                        </div>
                      {:else}
                        <div class="badge badge-warning badge-sm">추출 전</div>
                      {/if}
                    </td>
                    <td>
                      <span class="text-sm">
                        {item.file_size ? formatFileSize(item.file_size) : '-'}
                      </span>
                    </td>
                    <td>
                      <span class="text-sm">
                        {item.pages ? `${item.pages}페이지` : '-'}
                      </span>
                    </td>
                    <td>
                      <div class="text-sm text-base-content/70">
                        <div>{formatDate(item.created_at)}</div>
                        {#if item.is_extracted && item.extraction_date}
                          <div class="text-success text-xs">추출: {formatDate(item.extraction_date)}</div>
                        {/if}
                      </div>
                    </td>
                    <td class="text-right">
                      <div class="flex gap-2 justify-end">
                        {#if type === 'original'}
                          <button 
                            class="btn btn-primary btn-xs" 
                            on:click={() => handleExtract(item)}
                          >
                            문항 추출
                          </button>
                        {/if}
                        <div class="dropdown dropdown-end">
                          <div tabindex="0" role="button" class="btn btn-ghost btn-xs">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                            </svg>
                          </div>
                          <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-40 p-2 shadow">
                            <li><button on:click={() => handleEdit(item)}>편집</button></li>
                            <li><button on:click={() => handleDelete(item)} class="text-error">삭제</button></li>
                          </ul>
                        </div>
                      </div>
                    </td>
                  </tr>
                {/if}
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
    
    <!-- 빈 상태 -->
    {#if filteredMaterials.length === 0}
      <div class="text-center py-12">
        <div class="text-4xl mb-4">📁</div>
        <h3 class="text-lg font-medium mb-2">
          {type === 'original' ? '원본 자료가' : '제작한 자료가'} 없습니다
        </h3>
        <p class="text-base-content/70 mb-4">
          새 자료를 업로드하거나 만들어보세요
        </p>
        <div class="flex gap-2 justify-center">
          {#if type === 'original'}
            <button class="btn btn-primary" on:click={handleUpload}>자료 올리기</button>
          {/if}
          <button class="btn btn-outline" on:click={handleCreate}>자료 만들기</button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- 편집 모달 -->
{#if showEditModal && editingMaterial}
  <div class="modal modal-open">
    <div class="modal-box w-11/12 max-w-2xl">
      <h3 class="font-bold text-lg mb-4">자료 편집</h3>
      
      <div class="space-y-4">
        <!-- 기본 정보 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">자료 이름</span>
            </label>
            <input 
              type="text" 
              class="input input-bordered" 
              bind:value={editingMaterial.title}
              placeholder="자료 이름을 입력하세요"
            />
          </div>
          
          <div class="form-control">
            <label class="label">
              <span class="label-text">과목</span>
            </label>
            <select class="select select-bordered" bind:value={editingMaterial.subject}>
              <option value="">과목 선택</option>
              <option value="수학">수학</option>
              <option value="영어">영어</option>
              <option value="과학">과학</option>
              <option value="국어">국어</option>
              <option value="사회">사회</option>
              <option value="기타">기타</option>
            </select>
          </div>
        </div>
        
        <!-- 폴더 경로 -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">폴더 경로</span>
          </label>
          <div class="input-group">
            <span class="bg-base-200 px-3 py-2 border border-r-0 rounded-l-lg">📁</span>
            <input 
              type="text" 
              class="input input-bordered flex-1" 
              bind:value={editingMaterial.folder_path}
              placeholder="/폴더명 또는 /상위폴더/하위폴더"
            />
          </div>
          <label class="label">
            <span class="label-text-alt">예: /수학, /과학/화학, /시험지</span>
          </label>
        </div>
        
        <!-- 파일 정보 (읽기 전용) -->
        <div class="bg-base-200 rounded-lg p-4">
          <h4 class="font-medium mb-2">파일 정보</h4>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div>
              <span class="text-base-content/70">파일 타입:</span>
              <div class="flex items-center gap-1">
                <span class="text-lg {getFileTypeColor(editingMaterial.file_type)}">{getFileTypeIcon(editingMaterial.file_type)}</span>
                <span>{editingMaterial.file_type ? editingMaterial.file_type.split('/')[1].toUpperCase() : '-'}</span>
              </div>
            </div>
            <div>
              <span class="text-base-content/70">파일 크기:</span>
              <div>{editingMaterial.file_size ? formatFileSize(editingMaterial.file_size) : '-'}</div>
            </div>
            <div>
              <span class="text-base-content/70">페이지 수:</span>
              <div>{editingMaterial.pages ? `${editingMaterial.pages}페이지` : '-'}</div>
            </div>
            <div>
              <span class="text-base-content/70">생성일:</span>
              <div>{formatDate(editingMaterial.created_at)}</div>
            </div>
          </div>
        </div>
        
        <!-- 추출 상태 -->
        {#if editingMaterial.is_extracted}
          <div class="bg-success/10 border border-success/20 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-medium text-success flex items-center gap-2">
                <span>✅</span>
                문항 추출 완료
              </h4>
              <button 
                class="btn btn-outline btn-warning btn-xs"
                on:click={resetExtractionStatus}
              >
                상태 초기화
              </button>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span class="text-base-content/70">추출된 문항:</span>
                <div class="font-medium">{editingMaterial.extracted_count}개</div>
              </div>
              <div>
                <span class="text-base-content/70">추출일:</span>
                <div class="font-medium">{formatDate(editingMaterial.extraction_date)}</div>
              </div>
            </div>
          </div>
        {:else}
          <div class="bg-warning/10 border border-warning/20 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-medium text-warning flex items-center gap-2">
                <span>⏳</span>
                문항 추출 대기 중
              </h4>
              <button 
                class="btn btn-outline btn-primary btn-xs"
                on:click={() => handleExtract(editingMaterial)}
              >
                지금 추출하기
              </button>
            </div>
            <p class="text-sm text-base-content/70">
              이 자료에서 아직 문항을 추출하지 않았습니다.
            </p>
          </div>
        {/if}
        
        <!-- 빠른 액션 -->
        <div class="bg-base-200 rounded-lg p-4">
          <h4 class="font-medium mb-3">빠른 액션</h4>
          <div class="flex flex-wrap gap-2">
            <button 
              class="btn btn-outline btn-sm"
              on:click={() => navigator.clipboard.writeText(editingMaterial.title)}
            >
              📋 이름 복사
            </button>
            <button 
              class="btn btn-outline btn-sm"
              on:click={() => navigator.clipboard.writeText(editingMaterial.folder_path || '/')}
            >
              📁 경로 복사
            </button>
            {#if editingMaterial.is_extracted}
              <button 
                class="btn btn-outline btn-sm"
                on:click={() => goto('/my-materials?tab=question-bank&material=' + editingMaterial.id)}
              >
                📝 추출된 문항 보기
              </button>
            {/if}
            <button 
              class="btn btn-outline btn-sm"
              on:click={() => {
                closeEditModal();
                handleExtract(editingMaterial);
              }}
            >
              🔍 문항 추출하기
            </button>
          </div>
        </div>
      </div>
      
      <div class="modal-action">
        <button class="btn btn-ghost" on:click={closeEditModal}>
          취소 <span class="text-xs opacity-70">(Esc)</span>
        </button>
        <button 
          class="btn btn-primary" 
          on:click={saveEditedMaterial}
          disabled={!editingMaterial?.title?.trim() || !editingMaterial?.subject}
        >
          저장 <span class="text-xs opacity-70">(Ctrl+S)</span>
        </button>
      </div>
    </div>
    <div class="modal-backdrop" on:click={closeEditModal}></div>
  </div>
{/if}

<!-- 키보드 단축키 처리 -->
<svelte:window 
  on:keydown={(e) => {
    if (showEditModal) {
      if (e.key === 'Escape') {
        closeEditModal();
      } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveEditedMaterial();
      }
    }
  }}
/>

<!-- 폴더 생성 모달 -->
<FolderCreateModal 
  bind:isOpen={showFolderModal}
  parentId={folderParentId}
  currentPath={currentFolder}
  folderType="materials"
  on:create={handleFolderCreated}
  on:close={() => showFolderModal = false}
/>

<!-- 파일 업로드 모달 -->
<FileUploadModal
  bind:isOpen={showUploadModal}
  currentFolderId={currentFolderId}
  currentPath={currentFolder}
  on:upload={handleFilesUploaded}
  on:close={() => showUploadModal = false}
/>

<!-- 폴더 편집 모달 -->
{#if showFolderEditModal && editingFolder}
  <div class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">폴더 편집</h3>
      
      <div class="space-y-4">
        <div class="form-control">
          <label class="label">
            <span class="label-text">폴더 이름</span>
          </label>
          <input 
            type="text" 
            class="input input-bordered" 
            bind:value={editingFolder.name}
            placeholder="폴더 이름을 입력하세요"
          />
        </div>
        
        <div class="form-control">
          <label class="label">
            <span class="label-text">폴더 색상</span>
          </label>
          <div class="flex gap-2">
            {#each ['#gray', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'] as color}
              <button 
                class="btn btn-circle btn-sm {editingFolder.color === color ? 'ring-2 ring-offset-2' : ''}"
                style="background-color: {color}"
                on:click={() => editingFolder.color = color}
              />
            {/each}
          </div>
        </div>
      </div>
      
      <div class="modal-action">
        <button class="btn btn-ghost" on:click={() => {showFolderEditModal = false; editingFolder = null;}}>
          취소
        </button>
        <button 
          class="btn btn-primary" 
          on:click={saveFolderEdit}
          disabled={!editingFolder?.name?.trim()}
        >
          저장
        </button>
      </div>
    </div>
    <div class="modal-backdrop" on:click={() => {showFolderEditModal = false; editingFolder = null;}}></div>
  </div>
{/if}