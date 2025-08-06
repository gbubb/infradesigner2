# Development Standards

## Code Style
- Use TypeScript for all new files
- Prefer const over let
- Use async/await over promises
- Name files: PascalCase for components, camelCase for utilities

## Component Guidelines
- One component per file
- Props interfaces above component
- Use function components with hooks
- Export components separately from non-components for fast refresh
- Context exports should be in separate files from providers

## State Management
- Use Zustand stores for global state
- Use useState for local component state
- Document store slices purpose
- Memoize expensive computations with useMemo
- Wrap callbacks passed as props with useCallback

## Error Handling
- All async functions must have try-catch
- Log errors to console in development
- Show toast notifications for user errors
- Add error boundaries to critical UI sections

## React Hook Rules
- Include all dependencies in useEffect/useMemo/useCallback arrays
- Use useCallback for functions used in dependency arrays
- Avoid creating objects/arrays inline in dependency arrays

## Fast Refresh Compliance
- Only export components from component files
- Move hooks to separate files with Hook/Hooks suffix
- Move variants/styles to separate files with -variants suffix
- Export contexts separately from providers

## Import Organization
- External packages first
- Internal imports second (@/ aliases)
- Types last
- Group related imports together

## Performance Best Practices
- Use React.memo for expensive components
- Implement useMemo for complex calculations
- Add useCallback for event handlers passed as props
- Lazy load heavy components with React.lazy

## Testing
- Write tests for critical business logic
- Test calculations and data transformations
- Add smoke tests for main user flows

## Documentation
- Add JSDoc comments to complex functions
- Document business logic inline
- Keep README up to date with setup instructions
- Use meaningful variable and function names