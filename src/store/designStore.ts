
  saveDesign: () => {
    set((state) => {
      try {
        // Here, we need to properly type the components
        const assignedComponents: InfrastructureComponent[] = state.componentRoles
          .filter(role => role.assignedComponentId)
          .map(role => {
            const componentTemplate = allComponentTemplates.find(
              c => c.id === role.assignedComponentId
            );
            
            if (!componentTemplate) {
              throw new Error(`Component not found for role: ${role.role}`);
            }

            // Clone and return with proper typing - add role to the component
            return {
              ...componentTemplate,
              quantity: role.adjustedRequiredCount || role.requiredCount,
              role: role.role // Add the role to the component
            } as InfrastructureComponent;
          });

        // Create or update activeDesign
        const designToSave = state.activeDesign ? 
          { ...state.activeDesign, components: assignedComponents } : 
          {
            id: uuidv4(),
            name: `Design ${state.savedDesigns.length + 1}`,
            components: assignedComponents
          };

        // Save the design - now with properly typed components
        const updatedDesigns = [...state.savedDesigns, {
          id: designToSave.id,
          name: designToSave.name,
          createdAt: new Date(),
          requirements: state.requirements,
          components: assignedComponents
        }];
        
        toast.success("Design saved successfully!");
        return { 
          savedDesigns: updatedDesigns,
          activeDesign: designToSave
        };
      } catch (error) {
        console.error("Failed to save design:", error);
        toast.error("Failed to save design");
        return state;
      }
    });
  },
