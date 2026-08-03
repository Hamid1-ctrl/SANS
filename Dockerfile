# Multi-stage Dockerfile for SANS Web API (.NET 10)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build-env
WORKDIR /src

# Copy project files for efficient caching
COPY SANS.slnx ./
COPY backend/SANS.Domain/SANS.Domain.csproj ./backend/SANS.Domain/
COPY backend/SANS.Application/SANS.Application.csproj ./backend/SANS.Application/
COPY backend/SANS.Infrastructure/SANS.Infrastructure.csproj ./backend/SANS.Infrastructure/
COPY backend/SANS.WebAPI/SANS.WebAPI.csproj ./backend/SANS.WebAPI/
COPY backend/SANS.Tests/SANS.Tests.csproj ./backend/SANS.Tests/

# Restore dependencies
RUN dotnet restore backend/SANS.WebAPI/SANS.WebAPI.csproj

# Copy full source code and publish
COPY . ./
RUN dotnet publish backend/SANS.WebAPI/SANS.WebAPI.csproj -c Release -o /app/out

# Runtime container stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Copy published binaries
COPY --from=build-env /app/out .

# Configure port for cloud hosting (Render/Railway/Fly)
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "SANS.WebAPI.dll"]
