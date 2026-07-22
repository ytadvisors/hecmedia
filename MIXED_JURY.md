# Mixed-model PR jury

Every pull request to `master` must receive an approving review from a model
provider family different from the author's family. OpenAI-authored changes
require an Anthropic approval; Anthropic-authored changes require an OpenAI
approval. Human-authored changes require an agent-family approval.

The `Jury diversity / mixed-jury` check evaluates the latest standing verdict
from each reviewer and fails closed when an agent identity is unmapped. Review
submission or dismissal reruns the canonical check for the current PR head.
There is no label, administrator, or workflow-input bypass.

The workflow executes only the trusted base-branch checker through
`pull_request_target`; it never checks out or executes the proposed PR head.
After this workflow is merged and has reported once, repository branch
protection must require `Jury diversity / mixed-jury` and apply it to
administrators.
