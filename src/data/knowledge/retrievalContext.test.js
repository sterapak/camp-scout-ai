import { buildRetrievalContext } from './retrievalContext'
import { retrieveDocuments } from './knowledgeRetrieval'

describe('retrievalContext', () => {
  it('builds structured prompt context from retrieval results', () => {
    const results = retrieveDocuments({ query: 'bear', campgroundId: 'yosemite-upper-pines', limit: 2 })
    const context = buildRetrievalContext({
      question: 'What are the bear rules?',
      results,
    })

    expect(context.sourceCount).toBe(results.length)
    expect(context.promptContext).toContain('User question: What are the bear rules?')
    expect(context.promptContext).toContain('The following official campground knowledge')
    expect(context.promptContext).toContain('### Source 1:')
    expect(context.sources[0]).toMatchObject({
      id: results[0].document.id,
      title: results[0].document.title,
      sourceUrl: results[0].sourceUrl,
      sourceName: results[0].sourceName,
    })
  })

  it('returns empty-state context when no results match', () => {
    const context = buildRetrievalContext({
      question: 'nonexistent campground topic xyz',
      results: [],
    })

    expect(context.sourceCount).toBe(0)
    expect(context.sources).toEqual([])
    expect(context.promptContext).toContain('No matching knowledge documents were found.')
  })

  it('returns empty prompt context when question and results are empty', () => {
    const context = buildRetrievalContext({ question: '', results: [] })

    expect(context.promptContext).toBe('')
    expect(context.sourceCount).toBe(0)
  })
})
