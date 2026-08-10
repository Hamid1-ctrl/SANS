using SANS.Application.Interfaces;
using SANS.Infrastructure.Services.D1;

namespace SANS.Infrastructure.Repositories;

public class Repository<T> : IRepository<T> where T : class, new()
{
    protected readonly D1Context _context;
    protected readonly D1Table<T> _dbSet;

    public Repository(D1Context context)
    {
        _context = context;
        _dbSet = context.Table<T>();
    }

    public virtual Task<T?> GetByIdAsync(Guid id)
    {
        return _dbSet.FindAsync(id);
    }

    public virtual async Task<IEnumerable<T>> GetAllAsync()
    {
        return await _dbSet.GetAllAsync();
    }

    public virtual Task AddAsync(T entity)
    {
        return _dbSet.AddAsync(entity);
    }

    public virtual Task UpdateAsync(T entity)
    {
        return _dbSet.UpdateAsync(entity);
    }

    public virtual Task DeleteAsync(T entity)
    {
        return _dbSet.DeleteAsync(entity);
    }
}
