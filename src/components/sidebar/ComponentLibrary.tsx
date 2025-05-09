
import React, { useState } from 'react';
import { useComponents } from '@/context/ComponentContext';
import { useComponentForm } from '@/hooks/components/useComponentForm';
import { ComponentFormDialog } from './dialogs/ComponentFormDialog';
import { DeleteConfirmationDialog } from './dialogs/DeleteConfirmationDialog';
import { ComponentsTable } from './tables/ComponentsTable';
import { CategoryFilter } from './filters/CategoryFilter';
import { SearchBar } from './components/SearchBar';
import { ComponentLibraryHeader } from './components/ComponentLibraryHeader';
import { ComponentCategory, ComponentType, InfrastructureComponent, componentTypeToCategory } from '@/types/infrastructure';
import { useComponentsByType } from '@/hooks/design/useComponentsByType';
import { v4 as uuidv4 } from 'uuid';

export const ComponentLibrary: React.FC = () => {
  const { 
    componentTemplates,
    addComponentTemplate,
    updateComponentTemplate,
    cloneComponentTemplate,
    deleteComponentTemplate,
    setDefaultComponent
  } = useComponents();

  const { isDefaultForTypeAndRole } = useComponentsByType();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ComponentCategory | 'all'>('all');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteComponentId, setDeleteComponentId] = useState<string | null>(null);

  const {
    isAddDialogOpen,
    setIsAddDialogOpen,
    handleCloseAddDialog,
    isEditDialogOpen,
    setIsEditDialogOpen,
    handleCloseEditDialog,
    editingComponentId,
    setEditingComponentId,
    componentForm,
    setComponentForm,
    resetForm,
    handleInputChange,
    handleSelectChange,
    handleTypeChange,
    validateForm,
    processFormForSubmission
  } = useComponentForm();

  const filteredComponents = componentTemplates.filter(component => {
    const matchesSearch = 
      component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      component.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      component.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === 'all' || 
      componentTypeToCategory[component.type] === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleToggleDefault = (componentId: string, isDefault: boolean) => {
    if (isDefault) {
      const component = componentTemplates.find(c => c.id === componentId);
      if (component) {
        setDefaultComponent(component.type, component.role || '', componentId);
      }
    }
  };

  const openEditDialog = (component: InfrastructureComponent) => {
    setEditingComponentId(component.id);
    
    // Extract placement values for form fields
    const formValues = {
      ...component,
      isDefault: component.isDefault || false,
      validRUStart: component.placement?.validRUStart || 1,
      validRUEnd: component.placement?.validRUEnd || 42,
      preferredRU: component.placement?.preferredRU || 1,
      preferredRack: component.placement?.preferredRack || 1
    };
    
    setComponentForm(formValues);
    setIsEditDialogOpen(true);
  };

  const handleAddComponent = () => {
    if (!validateForm()) return;

    // Process the form for submission - consolidating placement fields
    const componentToSave = processFormForSubmission(componentForm);
    
    // Ensure ID is always set
    if (!componentToSave.id) {
      componentToSave.id = uuidv4();
    }

    if (editingComponentId) {
      updateComponentTemplate(editingComponentId, componentToSave);
      handleCloseEditDialog();
    } else {
      addComponentTemplate(componentToSave as InfrastructureComponent);
      handleCloseAddDialog();
    }
  };

  const openDeleteConfirmation = (id: string) => {
    setDeleteComponentId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deleteComponentId) {
      deleteComponentTemplate(deleteComponentId);
      setIsDeleteDialogOpen(false);
      setDeleteComponentId(null);
    }
  };

  return (
    <div className="container mx-auto py-4">
      <ComponentLibraryHeader onOpenAddDialog={() => setIsAddDialogOpen(true)} />
      
      <div className="flex items-center space-x-4 mb-6">
        <SearchBar value={searchTerm} onChange={setSearchTerm} />
        <CategoryFilter 
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
      </div>
      
      <ComponentsTable 
        components={filteredComponents}
        isDefaultForTypeAndRole={isDefaultForTypeAndRole}
        onToggleDefault={handleToggleDefault}
        onEdit={openEditDialog}
        onClone={cloneComponentTemplate}
        onDelete={openDeleteConfirmation}
      />

      <ComponentFormDialog 
        isOpen={isAddDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseAddDialog();
          else setIsAddDialogOpen(true);
        }}
        formValues={componentForm}
        onInputChange={handleInputChange}
        onSelectChange={handleSelectChange}
        onTypeChange={handleTypeChange}
        onSwitchChange={(checked) => {
          setComponentForm({
            ...componentForm,
            isDefault: checked
          });
        }}
        onCancel={() => {
          handleCloseAddDialog();
        }}
        onSubmit={handleAddComponent}
        isEditing={false}
      />
      
      <ComponentFormDialog 
        isOpen={isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseEditDialog();
          else setIsEditDialogOpen(true);
        }}
        formValues={componentForm}
        onInputChange={handleInputChange}
        onSelectChange={handleSelectChange}
        onTypeChange={handleTypeChange}
        onSwitchChange={(checked) => {
          setComponentForm({
            ...componentForm,
            isDefault: checked
          });
        }}
        onCancel={() => {
          handleCloseEditDialog();
        }}
        onSubmit={handleAddComponent}
        isEditing={true}
      />
      
      <DeleteConfirmationDialog 
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};
