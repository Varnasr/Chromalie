# Security policy

## Reporting a vulnerability

Email **care@pinpointventures.in**. Please do not open a public issue for a vulnerability.

Include a description of the problem, the steps to reproduce it and what it
would let someone do.

You will get an acknowledgement within 48 hours, and a fix for a critical issue
within 7 days.

## Scope

In scope: cross-site scripting, injection, exposed credentials or personal
data, and changes to published content by someone who should not be able to
make them.

For this repository that includes local saving and project import (a crafted project file), the asset import pipeline, and the artwork licences.

Out of scope: denial of service, social engineering, and vulnerabilities in
third-party services this site uses.

## Content protection and fork policy

See [LICENSE](../LICENSE). The code is MIT. The written content is CC BY-NC-ND 4.0.
The artwork is not licensed here, and it is not in this repository.

Forks may reuse the code under the MIT licence, with attribution. Forks may not
redistribute or republish the written content, and may not use the colouring
artwork, which belongs to its publishers. Forks must use their own storage for
any artwork they are licensed to use and their own build credentials.

## Takedown requests

If you find a copy of StoryWell content or a mirror that carries the artwork:

1. Note the URL and the files concerned.
2. File a notice with GitHub at https://github.com/contact, following its
   DMCA policy.
3. Tell care@pinpointventures.in so the takedown is tracked.

## The public key in the code

`dist/count.js` carries a Supabase publishable key. It is public by design and
can only call one function, which adds one to a daily tally. If you fork the
project, use your own Supabase project and key.

