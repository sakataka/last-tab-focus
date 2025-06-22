# Pull Request

## Description

Please provide a clear and concise description of what this PR does and why it's needed.

### Type of Change

Please delete options that are not relevant:

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Code refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Test coverage improvement

### Related Issues

Please link any related issues:

- Fixes #(issue number)
- Closes #(issue number)
- Related to #(issue number)

## Changes Made

Please provide a detailed list of the changes made:

- [ ] Change 1: Brief description
- [ ] Change 2: Brief description
- [ ] Change 3: Brief description

## Testing

### Testing Checklist

Please confirm that you have completed the following tests:

- [ ] Extension loads without errors in Chrome
- [ ] Basic tab switching functionality works
- [ ] Multi-window scenarios work correctly
- [ ] Edge cases are handled (last tab, discarded tabs, etc.)
- [ ] No console errors in service worker
- [ ] Performance remains good with many tabs (50+)
- [ ] Tested with Chrome version 88+ (minimum supported)

### Test Scenarios

Please describe the specific scenarios you tested:

1. **Scenario 1**: Description of what you tested
   - Expected: What should happen
   - Actual: What actually happened
   - Result: ✅ Pass / ❌ Fail

2. **Scenario 2**: Description of what you tested
   - Expected: What should happen
   - Actual: What actually happened
   - Result: ✅ Pass / ❌ Fail

### Test Files Used

If applicable, mention which test files were used:

- [ ] `dev/test-basic.html`
- [ ] `dev/test-multiwindow.html`
- [ ] Custom test scenario (describe below)

## Code Quality

### Code Review Checklist

Please confirm your code meets these standards:

- [ ] Code follows the existing style and patterns
- [ ] Functions are well-named and focused
- [ ] Error handling is implemented where needed
- [ ] Comments are added for complex logic
- [ ] No console.log statements left in production code
- [ ] Performance considerations have been addressed

### Breaking Changes

If this PR introduces breaking changes, please describe them:

- **Breaking Change 1**: Description and migration notes
- **Breaking Change 2**: Description and migration notes

## Documentation

### Documentation Updates

Please confirm any documentation changes made:

- [ ] README.md updated (if needed)
- [ ] CHANGELOG.md updated
- [ ] Code comments added/updated
- [ ] API documentation updated (if applicable)
- [ ] Contributing guidelines updated (if needed)

## Screenshots (if applicable)

Please add screenshots if your changes affect the user interface or behavior:

| Before | After |
|--------|-------|
| (screenshot) | (screenshot) |

## Additional Notes

### Implementation Details

Please provide any additional technical details about your implementation:

- Architecture decisions made
- Alternative approaches considered
- Performance implications
- Chrome API usage changes

### Potential Risks

Please identify any potential risks or concerns:

- Compatibility issues
- Performance impacts
- Security considerations
- User experience changes

### Future Considerations

Are there any follow-up tasks or future improvements related to this PR?

- [ ] Future task 1
- [ ] Future task 2
- [ ] Future task 3

## Reviewer Notes

Please provide any specific areas you'd like reviewers to focus on:

- Specific functions or files to pay attention to
- Areas where you're uncertain about the approach
- Performance-critical sections
- Complex logic that needs extra scrutiny

---

### Checklist for Reviewers

- [ ] Code is well-structured and readable
- [ ] Logic is sound and handles edge cases
- [ ] Error handling is appropriate
- [ ] Performance impact is acceptable
- [ ] Documentation is updated as needed
- [ ] Tests cover the changes adequately
- [ ] No security concerns identified

### Merge Requirements

This PR can be merged when:

- [ ] All tests pass
- [ ] Code review is complete and approved
- [ ] Documentation is updated
- [ ] CHANGELOG.md is updated
- [ ] No merge conflicts exist