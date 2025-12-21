using AIPlantHealthCheck.Domain.AggregatesModel.DeliverAggregate;

namespace AIPlantHealthCheck.Infrastructure.EntityConfigurations
{
    internal class DeliverRecordConfiguration : IEntityTypeConfiguration<DeliverRecord>
    {
        public void Configure(EntityTypeBuilder<DeliverRecord> builder)
        {
            builder.ToTable("deliverrecord");
            builder.HasKey(t => t.Id);
            builder.Property(t => t.Id).UseGuidVersion7ValueGenerator();
        }
    }

}
