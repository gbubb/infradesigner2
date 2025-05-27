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
import { ConnectorType, PortSpeed, CableMediaType } from '@/types/infrastructure';

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
    processFormForSubmission,
    addPort,
    removePort,
    updatePort
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
    // resetForm(); // Called by useComponentForm, avoid direct call if it clears RHF state too early
    setEditingComponentId(component.id);

    // Prepare formValues for react-hook-form initialization
    // Map old prefixed names to new direct names if necessary for backwards compatibility
    // and ensure all fields expected by the form are present.
    const initialFormValues: any = {
      ...component, // Spread the original component first
      isDefault: component.isDefault || false,
      validRUStart: component.placement?.validRUStart || 1,
      validRUEnd: component.placement?.validRUEnd || 42,
      preferredRU: component.placement?.preferredRU || 1,
      preferredRack: component.placement?.preferredRack || 1,
      ports: component.ports ?? [],
    };

    if (component.type === ComponentType.Transceiver) {
      // Explicitly map fields for transceivers, handling potential old prefixed names
      // The form and schema now expect direct names like 'speed', 'connectorType'.
      initialFormValues.transceiverModel = component.transceiverModel || (component as any).transceiverModel;
      initialFormValues.mediaTypeSupported = component.mediaTypeSupported || (component as any).mediaTypeSupported || [];
      
      // Handle mapping for connectorType (port-side for transceiver)
      initialFormValues.connectorType = component.connectorType || (component as any).transceiverConnectorType || ConnectorType.SFP;
      
      initialFormValues.mediaConnectorType = component.mediaConnectorType || ConnectorType.LC;
      
      // Handle mapping for speed
      initialFormValues.speed = component.speed || (component as any).transceiverSpeed || PortSpeed.Speed10G;
      
      initialFormValues.maxDistanceMeters = component.maxDistanceMeters || (component as any).maxDistanceMeters || 0;
      initialFormValues.wavelengthNm = component.wavelengthNm || (component as any).wavelengthNm;
      initialFormValues.ruSize = 0; // Transceivers always 0 RU
    }
    // Add similar mapping for other component types if their form fields were renamed
    // For Cable, ensure its specific fields are correctly passed if schema changed:
    if (component.type === ComponentType.Cable) {
        initialFormValues.connectorA_Type = component.connectorA_Type || ConnectorType.RJ45;
        initialFormValues.connectorB_Type = component.connectorB_Type || ConnectorType.RJ45;
        initialFormValues.mediaType = component.mediaType || CableMediaType.CopperCat6a; // CableMediaType
        initialFormValues.cableSpeed = component.cableSpeed || (component as any).speed || undefined; // map cable's own speed
        initialFormValues.length = component.length || 0;
    }

    console.log('Setting initial form values for editing (after mapping):', initialFormValues);
    setComponentForm(initialFormValues); 
    setIsEditDialogOpen(true);
  };

  // Updated to accept data from the form
  const handleAddComponent = (submittedData: any) => { 
    // The `validateForm()` call might be redundant if RHF + Zod handles all validation prior to this point.
    // if (!validateForm()) return; // validateForm was likely operating on the stale componentForm state.
    
    console.log('Data received by handleAddComponent:', submittedData);

    // Process the form for submission - consolidating placement fields, etc.
    // Crucially, use the submittedData from react-hook-form, not the old componentForm state.
    const componentToSave = processFormForSubmission(submittedData);
    
    // Ensure ID is always set for new components but not for edits
    if (!editingComponentId) {
      componentToSave.id = uuidv4();
    }
    
    console.log('Component to save:', componentToSave, 'Editing ID:', editingComponentId);

    if (editingComponentId) {
      updateComponentTemplate(editingComponentId, componentToSave);
      handleCloseEditDialog();
    } else {
      addComponentTemplate(componentToSave as InfrastructureComponent);
      handleCloseAddDialog();
    }
    
    // Always reset form after saving
    resetForm();
  };

  const openAddDialog = () => {
    // Reset form before opening add dialog
    resetForm();
    setIsAddDialogOpen(true);
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
      <ComponentLibraryHeader onOpenAddDialog={openAddDialog} />
      
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
          resetForm();
          handleCloseAddDialog();
        }}
        onSubmit={handleAddComponent}
        isEditing={false}
        addPort={addPort}
        removePort={removePort}
        updatePort={updatePort}
      />
      
      <ComponentFormDialog 
        isOpen={isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetForm();
            handleCloseEditDialog();
          }
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
          resetForm();
          handleCloseEditDialog();
        }}
        onSubmit={handleAddComponent}
        isEditing={true}
        addPort={addPort}
        removePort={removePort}
        updatePort={updatePort}
      />
      
      <DeleteConfirmationDialog 
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};
