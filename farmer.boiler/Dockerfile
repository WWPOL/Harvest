FROM hayd/alpine-deno:latest

# Use user deno so the bot isn't running as root
USER deno

# Install velociraptor
RUN deno install -qA -n vr https://deno.land/x/velociraptor@1.0.0-beta.16/cli.ts

WORKDIR /opt/harvest/farmer

# Copy and cache all of the dependencies
COPY deps.ts .
RUN deno cache deps.ts

# Copy all the rest of the files and type check them so they don't need to be checked every run
ADD . .
RUN deno cache mod.ts

# Run
CMD ["vr", "start"]
