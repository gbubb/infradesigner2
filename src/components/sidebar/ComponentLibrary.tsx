import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useComponents } from '@/context/ComponentHooks';
import { useComponentForm, ComponentFormValues } from '@/hooks/components/useComponentForm';
import { ComponentFormDialog } from './dialogs/ComponentFormDialog';
import { DeleteConfirmationDialog } from './dialogs/DeleteConfirmationDialog';
import { ComponentsTable } from './tables/ComponentsTable';
import { VirtualComponentsTable } from './tables/VirtualComponentsTable';
import { CategoryFilter } from './filters/CategoryFilter';
import { SearchBar } from './components/SearchBar';
import { ComponentLibraryHeader } from './components/ComponentLibraryHeader';
import { TableSkeleton } from '@/components/ui/loading-skeletons';
import { WithSkeleton } from '@/hooks/common/useLoadingSkeleton';
import { ComponentCategory, ComponentType, InfrastructureComponent, componentTypeToCategory } from '@/types/infrastructure';
import { useComponentsByType } from '@/hooks/design/useComponentsByType';
import { v4 as uuidv4 } from 'uuid';
import * as z from 'zod';
import { 
  ServerRole, 
  DiskSlotType, 
  NetworkPortType, 
  SwitchRole,
  DiskType,
  ConnectorType,
  CableMediaType
} from '@/types/infrastructure';
import { PortSpeed, MediaType } from '@/types/infrastructure/port-types';

// Define the form schema type for the data argument, mirroring ComponentFormDialog
const formSchema = z.object({
  type: z.nativeEnum(ComponentType),
  name: z.string().min(2),
  manufacturer: z.string().min(2),
  model: z.string().min(2),
  cost: z.number(),
  powerRequired: z.number(),
  isDefault: z.boolean(),
  namingPrefix: z.string().optional(),
  validRUStart: z.number().optional(),
  validRUEnd: z.number().optional(),
  preferredRU: z.number().optional(),
  preferredRack: z.number().optional(),
  serverRole: z.nativeEnum(ServerRole).optional(),
  cpuModel: z.string().optional(),
  cpuSockets: z.number().optional(),
  cpuCoresPerSocket: z.number().optional(),
  memoryCapacity: z.number().optional(),
  diskSlotType: z.nativeEnum(DiskSlotType).optional(),
  diskSlotQuantity: z.number().optional(),
  ruSize: z.number().optional(),
  networkPortType: z.nativeEnum(NetworkPortType).optional(),
  portsConsumedQuantity: z.number().optional(),
  switchRole: z.nativeEnum(SwitchRole).optional(),
  portCount: z.number().optional(),
  portSpeed: z.string().optional(),
  portSpeedType: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.nativeEnum(PortSpeed).optional()
  ),
  portsProvidedQuantity: z.number().optional(),
  layer: z.number().optional(),
  capacityTB: z.number().optional(),
  formFactor: z.string().optional(),
  interface: z.string().optional(),
  diskType: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.nativeEnum(DiskType).optional()
  ),
  rpm: z.number().optional(),
  iops: z.number().optional(),
  readSpeed: z.number().optional(),
  writeSpeed: z.number().optional(),
  throughput: z.number().optional(),
  connectionPerSecond: z.number().optional(),
  concurrentConnections: z.number().optional(),
  features: z.array(z.string()).optional(),
  supportedProtocols: z.array(z.string()).optional(),
  cassetteCapacity: z.number().optional(),
  portQuantity: z.number().optional(),
  length: z.number().optional(),
  portType: z.nativeEnum(ConnectorType).optional(),
  connectorA_Type: z.nativeEnum(ConnectorType).optional(),
  connectorB_Type: z.nativeEnum(ConnectorType).optional(),
  mediaType: z.nativeEnum(CableMediaType).optional(),
  cableSpeed: z.nativeEnum(PortSpeed).optional(),
  mediaTypeSupported: z.array(z.nativeEnum(MediaType)).optional(),
  connectorType: z.nativeEnum(ConnectorType).optional(),
  mediaConnectorType: z.nativeEnum(ConnectorType).optional(),
  speed: z.nativeEnum(PortSpeed).optional(),
  maxDistanceMeters: z.number().optional(),
  // Cassette and patch panel fields
  frontPortType: z.nativeEnum(ConnectorType).optional(),
  frontPortQuantity: z.number().optional(),
  backPortType: z.nativeEnum(ConnectorType).optional(),
  backPortQuantity: z.number().optional(),
  isBreakout: z.boolean().optional(),
  connectorB_Quantity: z.number().optional()
});

export const ComponentLibrary: React.FC = () => {
  const location = useLocation();
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
  const [isLoading, setIsLoading] = useState(false);

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

  // Handle navigation state to show specific component
  useEffect(() => {
    const state = location.state as { selectedComponentId?: string; scrollToComponent?: boolean } | null;
    
    if (state?.selectedComponentId) {
      // Find the component by ID
      const component = componentTemplates.find(
        c => c.id === state.selectedComponentId
      );
      
      if (component) {
        // Set search term to the exact component name to filter it
        setSearchTerm(component.name);
        // Also set the category to narrow down the results
        const category = componentTypeToCategory[component.type];
        setSelectedCategory(category);
      }
      
      // Clear the navigation state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state, componentTemplates]);

  // Simplest approach - if 'all' is selected and no search, show everything
  const filteredComponents = (() => {
    // No filters at all - show everything
    if (selectedCategory === 'all' && !searchTerm) {
      return componentTemplates;
    }
    
    // Apply filters
    return componentTemplates.filter(component => {
      // Search filter
      const matchesSearch = !searchTerm || 
        component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        component.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        component.model.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Category filter
      const matchesCategory = selectedCategory === 'all' || 
        componentTypeToCategory[component.type] === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  })();
  

  const handleToggleDefault = (componentId: string, isDefault: boolean) => {
    if (isDefault) {
      const component = componentTemplates.find(c => c.id === componentId);
      if (component) {
        setDefaultComponent(component.type, component.role || '', componentId);
      }
    }
  };

  const openEditDialog = (component: InfrastructureComponent) => {
    // First reset the form to clear any previous data
    resetForm();
    
    // Then set the editing ID
    setEditingComponentId(component.id);
    
    // Extract placement values for form fields
    const formValues = {
      ...component,
      isDefault: component.isDefault || false,
      validRUStart: component.placement?.validRUStart || 1,
      validRUEnd: component.placement?.validRUEnd || 42,
      preferredRU: component.placement?.preferredRU || 1,
      preferredRack: component.placement?.preferredRack || 1,
      ports: component.ports ?? [], // Ensure ports is always set for type safety
      // Ensure pcieSlots is properly parsed if it comes as a string
      pcieSlots: component.type === ComponentType.Server && 'pcieSlots' in component
        ? typeof (component as { pcieSlots?: string | Array<{ quantity: number; formFactor: string }> }).pcieSlots === 'string' 
          ? JSON.parse((component as { pcieSlots?: string }).pcieSlots!)
          : (component as { pcieSlots?: Array<{ quantity: number; formFactor: string }> }).pcieSlots
        : undefined,
    };
    
    // Log form values being set
    console.log('Setting form values for editing:', formValues);
    
    // Set the component form with the extracted values
    setComponentForm(formValues);
    setIsEditDialogOpen(true);
  };

  const handleAddComponent = (data: z.infer<typeof formSchema>) => {
    console.log('Form data received for processing:', data);

    // Process the form for submission - consolidating placement fields
    const processedData = {
      ...data,
      ports: componentForm.ports,
      type: data.type, // Ensure type is explicitly included
    } as unknown as ComponentFormValues;

    const componentToSave = processFormForSubmission(processedData);
    
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
      
      <WithSkeleton
        isLoading={isLoading}
        skeleton={<TableSkeleton rows={8} columns={8} />}
      >
        {/* Always use regular table for now to debug the issue */}
        <ComponentsTable 
          components={filteredComponents}
          isDefaultForTypeAndRole={isDefaultForTypeAndRole}
          onToggleDefault={handleToggleDefault}
          onEdit={openEditDialog}
          onClone={cloneComponentTemplate}
          onDelete={openDeleteConfirmation}
        />
      </WithSkeleton>

      <ComponentFormDialog 
        isOpen={isAddDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseAddDialog();
          else setIsAddDialogOpen(true);
        }}
        formValues={componentForm as unknown as Record<string, unknown>}
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
        formValues={componentForm as unknown as Record<string, unknown>}
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
